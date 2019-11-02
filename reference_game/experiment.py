"""Chatroom game."""

import logging
import socket
import json
from dallinger import networks
from dallinger.compat import unicode
from dallinger.config import get_config
from dallinger.experiment import Experiment
from dallinger.nodes import Agent
from dallinger.models import Network, Node

from dallinger.db import redis_conn

logger = logging.getLogger(__name__)

def extra_parameters():
    config = get_config()
    config.register("network", unicode)
    config.register("repeats", int)
    config.register("n", int)

class CoordinationChatroom(Experiment):
    """Define the structure of the experiment."""

    def __init__(self, session=None):
        """Initialize the experiment."""
        super(CoordinationChatroom, self).__init__(session)
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
        print('handleing msg', msg)

    def handle_connect(self, msg):
        # Once participant connects, add them to their respective game list
        network_id = msg['network_id']
        if network_id not in self.games :
            self.games[network_id] = []
            
        connected_player_list = self.games[network_id]
        connected_player_list.append(msg['participant_id'])

        # Once everyone is properly connected (i.e. nodes added, etc), send message to commence play
        if len(connected_player_list) == self.quorum :
            network = Network.query.filter_by(id=msg['network_id'])
            
            # TODO: this would be a lot more elegant if diff networks had diff channels
            # instead of sending everything through single channel (so everyone has to check if they're recipient)
            logger.info('sending newRound packet')
            redis_conn.publish('refgame', json.dumps({
                'type': 'newRound',
                'trialNum' : 1,
                'networkid' : msg['network_id'],
                'roles' : {'speaker' : connected_player_list[0], 'listener' : connected_player_list[1]}
            }))
            
    def send(self, raw_message) :
        """override default send to handle participant messages on channel"""
        handlers = {
            'connect' : self.handle_connect,
            'clickedObj' : self.handle_clicked_obj
        }
        if raw_message.startswith(self.channel + ":") :
            logger.info("We received a message for our channel: {}".format(
                raw_message))
            body = raw_message.replace(self.channel + ":", "")
            msg = json.loads(body)
            if msg['type'] in handlers:
                handlers[msg['type']](msg)
            else :
                logger.info("Received message: {}".format(raw_message))
