"""Chatroom game."""

import logging
import socket
import json
from dallinger import networks
from dallinger.compat import unicode
from dallinger.config import get_config
from dallinger.experiment import Experiment
from dallinger.nodes import Agent
from dallinger.db import redis_conn

from sqlalchemy import String
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.sql.expression import cast

logger = logging.getLogger(__name__)

def extra_parameters():
    config = get_config()
    config.register("network", unicode)
    config.register("repeats", int)
    config.register("n", int)

# class RefGameAgent(Agent):
#     # __mapper_args__ = {"polymorphic_identity": "ref_game_agent"}

#     @hybrid_property
#     def role(self) :
#         return str(self.property2)

#     @role.setter
#     def role(self, role) :
#         """Make role settable"""
#         self.property2 = repr(role)

#     @role.expression
#     def role(self):
#         """Make role queryable"""
#         return cast(self.property2, String)

class CoordinationChatroom(Experiment):
    """Define the structure of the experiment."""

    def __init__(self, session=None):
        """Initialize the experiment."""
        super(CoordinationChatroom, self).__init__(session)
        self.channel = 'chat'
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
        logger.info('recruitment ' + self.initial_recruitment_size)
        
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
        """When creating a node for a participant, assign a role."""
        a = Agent(network=network, participant=participant)
        # for other in a.neighbors() :
        #     print(other)
#        a.role = 'speaker'

    def handle_clicked_obj(self, msg) :
        print('oh wow they clicked object', msg)
        self.publish({'type' : 'feedback', 'objectId' : msg['clickedId']})

    def handle_connect(self, msg):
        logger.info('oh wow connect')
        
    def publish(self, msg):
        redis_conn.publish('chat', json.dumps(msg))
            
    def send(self, raw_message) :
        """override default send to handle participant messages on channel"""
        handlers = {
            'clickedObj' : self.handle_clicked_obj,
            'connect' : self.handle_connect
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
