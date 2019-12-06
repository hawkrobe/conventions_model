/*globals $, dallinger */
const ws_scheme = (window.location.protocol === "https:") ? 'wss://' : 'ws://';

class CoordinationChatRoomClient {
  constructor() {
    this.participantid = '';
    this.networkid = '';
    this.roomid = '';
    this.role = '';
    this.messageSent = false;
    this.alreadyClicked = false;
    this.waiting = false;
    this.nextPartner = '';
    this.score = 0;
    this.bonusAmt = 4;
    this.avatars = _.shuffle(_.map(_.range(1,7), i => "avatar" + i + ".png"));
    this.currStim = [];
    
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
	  participantid: self.participantid,
	  networkid : self.networkid
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
    $('#waiting').hide();
    $('#refgame').show();
    $("#chat-history").show();
    $("#feedback").html("");
    const roleToDisplay = this.role == 'speaker' ? 'director' : 'matcher';
    $("#role").html('You are the ' + roleToDisplay + '!');
    $("#trial-counter").text('partner ' + (this.partnerNum + 1) + '/3, ' +
			     'trial ' + (this.trialNum + 1) + '/16');
    $("#story").empty();
    $("#response-form").show();    
    $("#send-message").prop("disabled", false);
    $('#reproduction').prop('disabled', false);    
    $("#send-message").html("Send");
    $("#reproduction").focus();
  }
  
  initializeStimGrid() {
    self = this;
    $('#object-grid').empty();
    _.forEach(_.shuffle(this.currStim), (stim, i) => {
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

    // Show avatar
    $('#avatar').empty();
    $('#avatar').append($('<div/>').css({
      'background' : 'no-repeat center/80% url(./static/images/' + this.avatars[this.partnerNum] + ')',
      'width' : '100%', 'height' : '100%'
    }));

    // Outline target if speaker; set click handlers if listener
    if(this.role === 'speaker') {
      $('#target').css({'outline' : 'solid 10px #5DADE2', 'z-index': 2});
    } else if (this.role === 'listener') {
      $('div.pressable').click(event => {
	if(self.messageSent & !self.alreadyClicked) {
	  const clickedId = event.target.id;
	  self.alreadyClicked = true;
	  self.socket.broadcast({
	    'type' : 'clickedObj',
	    'object_id' : clickedId,
	    'stim_set_id' : self.stimsetid,
	    'trialnum' : self.trialNum,
	    'previously_interacted_with_neighbor_of_partner' : self.prev,
	    'partnernum' : self.partnerNum,
	    'roomid' : self.roomid, 'networkid' : self.networkid, 'participantid' : self.participantid});
	}
      });
    }
  };

  sendMessage (msg) {
    $("#send-message").prop('disabled', true);
    $("#send-message").html("Sending...");
    $("#reproduction").val("");
    $("#reproduction").focus();
    if(msg != '') {
      this.socket.broadcast({
	'type' : 'chatMessage',
	'content' : msg,
        'stimsetid' : this.stimsetid,
        'target' : this.targetURL,
        'repid' : Math.floor(this.trialNum / 4),
	'trialnum' : this.trialNum,
	'partnernum' : this.partnerNum,
	'networkid' : this.networkid,
	'participantid' : this.participantid,
	'roomid' : this.roomid,
	'role' : this.role
      });
    }
    $("#send-message").prop('disabled', false);
    $("#send-message").html("Send");
  }

  handleClickedObj(msg) {
    const correct = msg.object_id == "target";
    
    // freeze UI
    $("#send-message").prop("disabled", true);
    $('#reproduction').val('');
    $('#reproduction').prop('disabled', true);    
    
    // show highlights as outlines
    const targetcolor = this.role == 'speaker' ? '#5DADE2' : '#000000';
    const clickedcolor = correct ? '#32CD32' :'#FF4136';
    $('#target').css({outline: 'solid 10px ' + targetcolor, 'z-index': 2});
    $('#' + msg.object_id).css({outline: 'solid 10px ' + clickedcolor, 'z-index': 3});
    $('#feedback').html(correct ? "Nice! You earned " + this.bonusAmt + " cents." :
			this.role == 'speaker' ? "Oh no! Your partner didn't pick the target!" :
			"Oh no! Your partner was describing a different image.");
    
    // update score
    this.score += correct ? this.bonusAmt : 0;
    const bonus_score = (parseFloat(this.score) / 100).toFixed(2);
    $('#score').empty().append('total bonus: $' + bonus_score);
  }
  
  handleChatReceived (msg) {
    // Only allow to click after speaker produces message
    if(msg.role == 'speaker') {
      this.messageSent = true;
    }

    // Add message to chat log (and scroll to bottom)
    const color = msg.role == this.role ? 'black' : '#1693A5';

    $("#story")
      .append("<p style='color: " + color + ";'>" + msg.content + "</p>")
      .stop(true,true)
      .animate({
	scrollTop: $("#story").prop("scrollHeight")
      }, 800);
  }

  handleOtherGameNewTrial(msg) {
    if(this.waiting && _.includes(msg.participantids, this.nextPartner)) {
      var percent = Math.round((msg.trialNum / 16) * 100.0) + '%';
      $("#partner-progress-bar").css("width", percent);
      $("#progress-percentage").text(percent);
    }
  }
  
  handleNewTrial(msg) {
    this.nextPartner = '';
    this.waiting = false;
    this.trialNum = msg['trialNum'];
    this.role = msg['roles']['speaker'] == this.participantid ? 'speaker' : 'listener';
    this.roomid = msg['roomid'];
    this.partnerNum = msg['partnerNum'];
    this.currStim = msg['currStim'];
    this.targetURL = msg['targetURL'];
    this.stimsetid = msg['stim_set_id'];
    this.prev = msg['prev'];
    this.alreadyClicked = false;
    this.messageSent = false;      
    this.initializeStimGrid();
    this.initializeUI();
  }

  handleWaitForPartner (msg) {
    this.waiting = true;
    this.nextPartner = msg.schedule[this.participantid][msg.partnerNum];
    this.partnerNum = msg.partnerNum;
    $('#refgame').hide();
    $('#waiting').show();
    var dollars = this.score / 100;
    dollars = dollars.toLocaleString("en-US", {style:"currency", currency:"USD"});
    $('#message').empty().html(
      "<h1>Partner " + (this.partnerNum) + " has left the room. </h1>" +
	"<p>Here is your next partner.</p>"
    ).append($('<div/>').css({
      'background' : 'no-repeat center/80% url(./static/images/' + this.avatars[this.partnerNum] + ')',
      'width' : '10vh', 'height' : '10vh', 'left' : '45%', 'position' : 'relative'
    })).append("<p>You are now waiting for your next partner to finish their current game.</p> <p>The progress bar below is updated each time they finish a round, so you can see how close they are to finishing!</p>");
    $('#submessage').html(
      "You've earned a bonus of " + dollars + " so far, " +
	"and will earn a bonus up to $1.92 if you play with all 3 partners!"
    );
  }

  handleDisconnect (msg) {
    // Leave the chatroom.
    dallinger.allowExit();
    dallinger.goToPage("questionnaire");
  }

  block (callback) {
    // only pass to callback if intended for us; participant ids are unique, so this is one way messages
    // can be intended for a single individual; otherwise, check network id and room id
    return msg => {
      if(_.includes(msg.participantids, this.participantid))
	callback(msg);
      else if(msg.networkid == this.networkid && msg.roomid == this.roomid)
	callback(msg);
      else if(msg.networkid == this.networkid && !_.has(msg, 'roomid')) {
	callback(msg);
      }
    }
  }
  
  
  setupHandlers() {
    self = this;
    
    // Handle messages from server
    this.socket.subscribe(this.handleOtherGameNewTrial.bind(this), "newTrial", this);
    this.socket.subscribe(self.block(this.handleNewTrial.bind(this)), "newTrial", this);
    this.socket.subscribe(self.block(this.handleChatReceived.bind(this)), "chatMessage", this);
    this.socket.subscribe(self.block(this.handleClickedObj.bind(this)), "clickedObj", this);
    this.socket.subscribe(self.block(this.handleWaitForPartner.bind(this)), "waitForPartner", this);
    this.socket.subscribe(self.block(this.handleDisconnect.bind(this)), "disconnectClient", this);

    // Send whatever is in the chatbox when button clicked
    $("#send-message").click(() => {
      const msg = $("#reproduction").val();
      self.sendMessage(msg);
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
  dallinger.preventExit = true;
  new CoordinationChatRoomClient();
});
