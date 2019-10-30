/*globals $, dallinger */
var my_node_id;
var ws_scheme = (window.location.protocol === "https:") ? 'wss://' : 'ws://';
var socket = new ReconnectingWebSocket(
  ws_scheme + window.location.host + "/chat?channel=chat"
);

// Create the agent.
var create_agent = function () {
  dallinger.createAgent()
    .done(function (resp) {
      my_node_id = resp.node.id;
      console.log(my_node_id);
      $("#chat-history").show();
      $("#response-form").show();
      $("#send-message").removeClass("disabled");
      $("#send-message").html("Send");
      $("#reproduction").focus();
    })
    .fail(function (rejection) {
      // A 403 is our signal that it's time to go to the questionnaire
      if (rejection.status === 403) {
        dallinger.allowExit();
        dallinger.goToPage('questionnaire');
      } else {
        dallinger.error(rejection);
      }
    });
};

var initialize_grid = function() {
  var currStim = [
    {url: 'tangram_A.png', targetStatus: 'target'},
    {url: 'tangram_B.png', targetStatus: 'distractor1'},
    {url: 'tangram_C.png', targetStatus: 'distractor2'}
  ];
  _.forEach(currStim, (stim, i) => {
    var bkg = 'url(./static/images/' + stim.url + ')';
    var div = $('<div/>')
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
};

var display_info = function(msg) {
  $("#story")
    .append("<p>" + msg + "</p>")
    .stop(true,true)
    .animate({
      scrollTop: $("#story").prop("scrollHeight")
    }, 800);
;
};

var send_message = function() {
  $("#send-message").addClass("disabled");
  $("#send-message").html("Sending...");

  const response = $("#reproduction").val();
  $("#reproduction").val("");
  $("#reproduction").focus();

  socket.send('chat:' + JSON.stringify({
    'type' : 'message', 'content' : response
  }));
  
  socket.send('chat:' + JSON.stringify({
    'type' : 'clickedObj', 'objectID' : '1'
  }));
  $("#send-message").removeClass("disabled");
  $("#send-message").html("Send");
};

var leave_chatroom = function() {
  dallinger.goToPage("questionnaire");
};

$(document).keypress(function (e) {
  if (e.which === 13) {
    console.log("enter!");
    $("#send-message").click();
    return false;
  }
});

$(document).ready(function() {
  socket.onmessage = function(e) {
    var handlers = {'message' : (msg) => display_info(msg.content)};
    var raw_message = e.data;
    if(raw_message.startsWith("chat:")) {
      console.log("We received a message for our channel: " + raw_message);
      var body = JSON.parse(raw_message.replace("chat:", ""));
      if(handlers.hasOwnProperty(body.type)) {
	handlers[body.type](body);
      } else {
	console.log("Received mysterious message", raw_message);
      }
    }
  };

  // Send a message.
  $("#send-message").click(function() {
    send_message();
  });

  // Leave the chatroom.
  $("#leave-chat").click(function() {
    leave_chatroom();
  });

  // Proceed to the waiting room.
  $("#go-to-waiting-room").click(function() {
      dallinger.goToPage("waiting");
  });

});
