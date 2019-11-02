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
    $("#story").empty();
    $("#response-form").show();
    $("#send-message").removeClass("disabled");
    $("#send-message").html("Send");
    $("#reproduction").focus();
  }
  
  initializeStimGrid() {
    $('#object-grid').empty();
    _.forEach(this.currStim, (stim, i) => {
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
	  this.socket.broadcast({'type' : 'clickedObj', 'object_id' : clickedId, 'network_id' : this.networkid});
	}
      });
    }
  };

  handleClickedObj(msg) {
    // after we or partner have made response, show feedback
    $("#send-message").addClass("disabled");
    $('#reproduction').val('');
    $('#reproduction').addClass('disabled');    
    
    // show highlights as outlines
    var targetcolor = this.role == 'speaker' ? '#5DADE2' : '#000000';
    var clickedcolor = msg.object_id == 'target' ? '#32CD32' :'#FF4136';
    $('#target').css({outline: 'solid 10px ' + targetcolor, 'z-index': 2});
    $('#' + msg.object_id).css({outline: 'solid 10px ' + clickedcolor, 'z-index': 3});  
  }
  
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

  newRound(msg) {
    if(msg.networkid == this.networkid) {
      this.trialNum = msg['trialNum'];
      this.role = msg['roles']['speaker'] == this.participantid ? 'speaker' : 'listener';
      this.currStim = msg['currStim'];
      this.alreadyClicked = false;
      this.messageSent = false;      
      this.initializeStimGrid();
      this.initializeUI();
    }
  }
  
  setupHandlers() {
    self = this;
    
    // Handle messages from server
    this.socket.subscribe(this.newRound, "newRound", this);
    this.socket.subscribe(this.handleChatReceived, 'chatMessage', this);
    this.socket.subscribe(this.handleClickedObj, 'clickedObj', this);
    
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
