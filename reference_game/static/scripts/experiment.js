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
      $("#stimulus").show();
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

var display_info = function(msg) {
  $("#story").append("<p>" + msg + "</p>");
};

var send_message = function() {
  $("#send-message").addClass("disabled");
  $("#send-message").html("Sending...");

  const response = $("#reproduction").val();
  $("#reproduction").val("");
  $("#reproduction").focus();

  socket.send('chat:' + response);
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
  socket.onmessage = function(msg) {
    console.log(msg);
    if(msg.data.split(":")[0] == 'chat')
      display_info(msg.data.split(":")[1]);
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
