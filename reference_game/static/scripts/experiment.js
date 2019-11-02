/*globals $, dallinger */
const ws_scheme = (window.location.protocol === "https:") ? 'wss://' : 'ws://';

class CoordinationChatRoomClient {
  constructor() {
    this.nodeid = '';
    this.networkid = '';
    this.messageSent = false;
    this.alreadyClicked = false;

    // immediately open socket connection for game 
    this.socket = pubsub.Socket({"endpoint": "chat", "broadcast" : "refgame", "control":"refgame"});
    this.socket.open().done(() => this.createAgent());
  }

  createAgent() {
    self = this;
    dallinger.createAgent()
      .done(resp => {
	// initialize game
	self.participantid = resp.node.participant_id;
	self.networkid = resp.node.network_id;
	self.setupHandlers();

	// once we get our node, need to tell the server (again) that we've connected so it can launch
	self.socket.send({
	  'type' : 'connect',
	  participant_id: self.participantid,
	  network_id : self.networkid
	});
      })
      .fail(rejection => {
	// A 403 is our signal that it's time to go to the questionnaire
	if (rejection.status === 403) {
          dallinger.allowExit();
          dallinger.goToPage('questionnaire');
	} else {
          dallinger.error(rejection);
	}
      });
  }

  initializeUI() {
    $("#chat-history").show();
    $("#response-form").show();
    $("#send-message").removeClass("disabled");
    $("#send-message").html("Send");
    $("#reproduction").focus();
  }
  
  initializeStimGrid(currStim) {
    $('#object-grid').empty();
    _.forEach(currStim, (stim, i) => {
      const bkg = 'url(./static/images/' + stim.url + ')';
      const div = $('<div/>')
	  .addClass('pressable')
	  .attr({'id' : stim.targetStatus})
	  .css({'background' : bkg})
	  .css({
	    'position': 'relative',
	    'grid-row': 1, 'grid-column': i+1,
	    'background-size' :'cover'
	  });
      $("#object-grid").append(div);
    });

    // Outline target if speaker; set click handlers if listener
    if(this.role === 'speaker') {
      $('#target').css({'outline' : 'solid 10px #5DADE2', 'z-index': 2});
    } else if (this.role === 'listener') {
      $('div.pressable').click(event => {
	if(self.messageSent & !self.alreadyClicked) {
	  const clickedId = event.target.id;
	  this.alreadyClicked = true;
	  this.socket.broadcast({'type' : 'clickedObj', 'objectID' : clickedId});
	}
      });
    }
  };

  handleChatReceived (msg) {
    this.messageSent = true;
    $("#story")
      .append("<p>" + msg.content + "</p>")
      .stop(true,true)
      .animate({
	scrollTop: $("#story").prop("scrollHeight")
      }, 800);
  }

  sendMessage (msg) {
    $("#send-message").addClass("disabled");
    $("#send-message").html("Sending...");
    $("#reproduction").val("");
    $("#reproduction").focus();
    if(msg != '') {
      this.socket.broadcast({
	'type' : 'chatMessage', 'content' : msg
      });
    }
    $("#send-message").removeClass("disabled");
    $("#send-message").html("Send");
  }

  sendResponse(id) {
  }

  newRound(msg) {
    if(msg.networkid == this.networkid) {
      this.trialNum = msg['trialNum'];
      this.role = msg['roles']['speaker'] == this.participantid ? 'speaker' : 'listener';
      this.currStim = msg['currStim'];
      const currStim = [
	{url: 'tangram_A.png', targetStatus: 'target'},
	{url: 'tangram_B.png', targetStatus: 'distractor1'},
	{url: 'tangram_C.png', targetStatus: 'distractor2'}
      ];
      this.initializeStimGrid(currStim);
      this.initializeUI();
    }
  }
  
  setupHandlers() {
    self = this;
    
    // Handle messages from server
    this.socket.subscribe(this.newRound, "newRound", this);
    this.socket.subscribe(this.handleChatReceived, 'chatMessage', this);
    
    // Send whatever is in the chatbox when button clicked
    $("#send-message").click(() => {
      const msg = $("#reproduction").val();
      self.sendMessage(msg);
    });
    
    // Leave the chatroom.
    $("#leave-chat").click(function() {
      dallinger.goToPage("questionnaire");
    });
  }
}

$(document).keypress(e => {
  if (e.which === 13) {
    $("#send-message").click();
    return false;
  }
});

$(document).ready(() => {
  console.log('ready');
  new CoordinationChatRoomClient();
});
