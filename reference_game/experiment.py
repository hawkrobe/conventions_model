"""Chatroom game."""

import logging
import socket
import json
import threading
import random

from dallinger import networks
from dallinger.compat import unicode
from dallinger.config import get_config
from dallinger.experiment import Experiment
from dallinger.nodes import Agent
from dallinger.models import Network, Node, Info, Participant

from dallinger.db import redis_conn

logger = logging.getLogger(__name__)

contexts = [['tangram_A.png', 'tangram_B.png', 'tangram_C.png', 'tangram_D.png'],
            ['tangram_E.png', 'tangram_F.png', 'tangram_G.png', 'tangram_L.png'],
            ['tangram_I.png', 'tangram_J.png', 'tangram_K.png', 'tangram_H.png']]
            
def extra_parameters():
    config = get_config()
    config.register("network", unicode)
    config.register("repeats", int)
    config.register("n", int)

def prev_interacted_with_neighbor(schedule, pair, partner_num) :
    history1 = set(schedule[pair[0]][:partner_num])
    history2 = set(schedule[pair[1]][:partner_num])
    return not history1.isdisjoint(history2)

class RefGameRoom() :
    def __init__(self, refgame, partner_num, player_ids, prev) :
        """ Create a room for the given dyad"""
        self.network_id = refgame.network_id
        self.stim_set_id = refgame.stim_set_id
        self.room_id = refgame.num_rooms
        self.partner_num = partner_num
        self.prev = prev

        # list of ids is scrambled to randomize roles with each partner
        self.players = random.sample(player_ids, len(player_ids))
        self.context = contexts[self.stim_set_id]
        
        self.trialNum = -1
        self.trialList = []
        self.numRepetitions = 1
        self.numTrials = self.numRepetitions * len(self.context)
        self.make_trial_list()
        
    def new_trial (self) :
        """ 
        advance to the next trial 
        """
        self.trialNum = self.trialNum + 1
        new_trial = self.trialList[self.trialNum]
        packet = json.dumps({
            'type': 'newTrial',
            'networkid' : self.network_id,
            'roomid' : self.room_id,
            'stim_set_id' : self.stim_set_id,
            'participantids' : self.players,
            'partnerNum' : self.partner_num,
            'prev' : self.prev,
            'trialNum' : self.trialNum,
            'currStim' : new_trial['stimuli'],
            'roles' : {'speaker' : self.players[0], 'listener' : self.players[1]}
        })
        
        redis_conn.publish('refgame', packet)

    def make_trial_list(self) :
        # Keep sampling trial lists until we meet criterion
        # Show each object once as target in each repetition block
        while not self.check_trial_list() :
            self.trialList = [];
            for repetition in range(self.numRepetitions) :
                for target in random.sample(self.context, len(self.context)) :
                    self.trialList.append(self.sample_trial(repetition, target));

    def check_trial_list (self) :
        trialList = self.trialList
        lengthMatch = len(trialList) == self.numTrials
        noRepeats = all([trialList[i]['targetImg']['url'] != trialList[i+1]['targetImg']['url']
                         for i in range(len(trialList) - 1)])
        return lengthMatch and noRepeats
  
    def sample_trial (self, repetition, targetUrl) :
        target = {'url': targetUrl , 'targetStatus' : 'target'};
        dist_nums = list(range(len(self.context) - 1))
        distractors = [{'url': d, 'targetStatus': "distr" + str(dist_nums.pop())}
                       for d in self.context if d != targetUrl]
        return {
            'targetImg' : target,
            'stimuli': distractors + [target]
        }
    
class RefGame :
    def __init__(self, network_id, num_players) :
        self.network_id = network_id
        self.num_players = num_players
        self.stim_set_id = random.choice([0,1,2])        
        self.players = []
        self.rooms = []
        self.schedule = {}
        self.num_rooms = 0
        self.roomAssignments = []
        
    def createSchedule(self):
        """ 
        Create a schedule for all players to play all others using 'circle' method
        (en.wikipedia.org/wiki/Round-robin_tournament#Scheduling_algorithm)
        """
        l = self.players.copy()
        self.schedule = {k : [] for k in l}
        assert(self.num_players % 2 == 0)
        for i in range(self.num_players - 1):
            mid = int(self.num_players / 2)
            l1 = l[:mid]
            l2 = l[mid:]
            l2.reverse()
            self.roomAssignments.append(list(zip(l1, l2)))
            for i in range(mid) :
                self.schedule[l1[i]].append(l2[i])
                self.schedule[l2[i]].append(l1[i])
                
            # rotate around fixed point
            l.insert(1, l.pop())

    def assignPartners(self, partner_num) :
        """ 
        create rooms and try to launch next games
        TODO: potential bug here if game gets *way* behind. 
              might need to store partner_num in 'ready' 
              suppose player A just finished partner 1 and player B just finished partner 2.
              if player B's next partner is supposed to be A, this might force A to skip a partner. 
        """
        current_pairs = self.roomAssignments[partner_num]
        
        for pair in current_pairs :
            if set(pair).issubset(set(self.ready)) :
                prev = prev_interacted_with_neighbor(self.schedule, pair, partner_num)
                new_room = RefGameRoom(self, partner_num, pair, prev)
                self.ready.remove(pair[0])
                self.ready.remove(pair[1])
                self.num_rooms += 1
                self.rooms.append(new_room)
                new_room.new_trial()
        
    def new_partner(self, room_id, partner_num) :
        """ 
        advance to the next partner on game schedule
        """
        ids = self.rooms[room_id].players
        if partner_num + 1 >= self.num_players :
            self.players.remove(ids[0])
            self.players.remove(ids[1])
            redis_conn.publish(
                'refgame',
                json.dumps({'type' : 'disconnectClient', 'participantids' : ids})
            )
        else :
            self.ready.extend(ids)
            redis_conn.publish(
                'refgame',
                json.dumps({'type' : 'waitForPartner', 'participantids' : ids, 'partnerNum' : partner_num})
            )
            t = threading.Timer(4, lambda : self.assignPartners(partner_num))
            t.start()        

class RefGameServer(Experiment):
    """Define the structure of the experiment."""

    def __init__(self, session=None):
        """Initialize the experiment."""
        super(RefGameServer, self).__init__(session)
        self.channel = 'refgame'
        self.games = {}
        if session:
            self.setup()

    def configure(self):
        config = get_config()
        self.experiment_repeats = repeats = config.get("repeats")
        self.network_class = config.get("network")
        self.quorum = config.get("n")

        # Recruit for all networks at once
        self.initial_recruitment_size = repeats * self.quorum

    def create_network(self):
        """Create a new network by reading the configuration file."""
        class_ = getattr(networks, self.network_class)
        return class_(max_size=self.quorum)

    def choose_network(self, networks, participant):
        # Choose first available network rather than random
        return networks[0]

    def info_post_request(self, node, info):
        """Run when a request to create an info is complete."""
        for agent in node.neighbors():
            node.transmit(what=info, to_whom=agent)

    def create_node(self, participant, network):
        """Create a node for a participant."""
        return Agent(network=network, participant=participant)

    def handle_clicked_obj(self, msg) :
        """ When we find out listener has made response, schedule next round to begin """
        curr_network = self.games[msg['networkid']]
        curr_room = curr_network.rooms[msg['roomid']]

        # after final trial, we assign a next partner; otherwise, schedule next trial
        if curr_room.trialNum + 1 >= curr_room.numTrials :
            t = threading.Timer(1, lambda : curr_network.new_partner(msg['roomid'], curr_room.partner_num + 1))
        else :
            t = threading.Timer(2, lambda : curr_room.new_trial())
        t.start()

    def handle_disconnect(self, msg) :
        network_id = msg['networkid']

        # if disconnected participant has not already finished game, disconnect rest of their network
        if msg['participantid'] in self.games[network_id].players :
            redis_conn.publish(
                'refgame',
                json.dumps({'type' : 'disconnectClient', 'networkid' : network_id})
            )
        
    def handle_connect(self, msg):
        network_id = msg['networkid']

        # create game object if first player in network to join
        if network_id not in self.games :
            self.games[network_id] = RefGame(network_id, self.quorum)

        # Once participant connects, add them to their respective game list
        game = self.games[network_id]
        game.players.append(msg['participantid'])

        # After everyone is properly connected, send packet for first trial
        if len(game.players) == self.quorum :
            game.ready = game.players.copy()
            game.createSchedule()
            game.assignPartners(partner_num=0)
        
    def record (self, msg) :
        """ store an Info object for this msg in the database """
        node = Participant.query.get(msg['participantid']).all_nodes[0]
        info = Info(origin=node, contents=msg['type'], details=msg)
        self.session.add(info)
        self.session.commit()
        
    def send(self, raw_message) :
        """override default send to handle participant messages on channel"""
        handlers = {
            'disconnect' : self.handle_disconnect,
            'connect' : self.handle_connect,
            'chatMessage' : lambda msg : None,
            'clickedObj' : self.handle_clicked_obj
        }
        
        if raw_message.startswith(self.channel + ":") :
            logger.info("We received a message for our channel: {}".format(raw_message))
            body = raw_message.replace(self.channel + ":", "")
            msg = json.loads(body)

            # Record message as event in database and call handler
            if msg['type'] in handlers:
                self.record(msg)
                handlers[msg['type']](msg)
            else :
                logger.info("Received message: {}".format(raw_message))
