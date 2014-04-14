// Initial code by Borui Wang, updated by Graham Roth
// For CS247, Spring 2014

(function() {

  var cur_video_blob = null;
  var fb_instance;
  var chat_room_id;
  var currentUser;
  var mediaRecorder;
  var emojis = [];
  var profileVideo;

  $(document).ready(function(){
    connect_to_chat_firebase();
    connect_webcam();
  });

  var numRecording = 0;
  var firstKey = true;

  function recordVideo(incrementRecording){
    if (mediaRecorder){
      if(incrementRecording){
        numRecording++;
        $("#recordLabel").html("<b>RECORDING (WAIT TO HIGHLIGHT MORE EMOTICONS)</b>");
      }
      mediaRecorder.start(1000);
    }
  }

  function startHighlighting(){
    $("#submit").text("Send Message");
    $("#submission input").prop('disabled', true);
    $("#emojiList").html("Emoticons: <table><tr id='emojiTable'></tr></table>");
    if(cur_video_blob) $("#instructions").html("Highlight words in your message to attach video emoticon!  Click on a video emoticon to re-record.");
    else $("#instructions").html("Turn on your camera and highlight words in your message to attach video emoticon!  Click on a video emoticon to re-record.");

    $("#textInput").mouseup(function ( event ){
      if (numRecording > 0) return;
      t = (document.all) ? document.selection.createRange().text : document.getSelection();
      var selectedText = t.toString();
      if (selectedText && isNewEmoji(selectedText, emojis) && mediaRecorder){
        var emojiColor = "#"+((1<<24)*Math.random()|0).toString(16);

        recordVideo(true);

        setTimeout(function(){
          numRecording--;
          if(numRecording == 0) $("#recordLabel").html("");
          var location = emojis.push({str: selectedText, video: cur_video_blob, color:emojiColor });
          $("#emojiTable").append("<td class='tdEmojiInList'><span class='emojiInList' name="+(location-1)+" style='color:"+emojiColor+"'><center>"+selectedText+"</center><br><video width='120' src='"+URL.createObjectURL(base64_to_blob(cur_video_blob))+"' autoplay loop></video></span></td>");

          $(".emojiInList").click(function(){
            if (numRecording == 0){
              recordVideo(true);
              var clickedObj = $(this);
              clickedObj.parent('td').css('background-color', 'lightgray');
              setTimeout(function(){
                clickedObj.parent('td').css('background-color', '');
                numRecording--;
                if(numRecording == 0) $("#recordLabel").html("");
                emojis[parseInt(clickedObj.attr('name'))].video = cur_video_blob;
                clickedObj.children('video').attr('src', URL.createObjectURL(base64_to_blob(cur_video_blob)));
              }, 1500);
            }
          });

        }, 1500);
      }
    });
  }

  function sendMessage(fb_instance_stream, username, my_color){
    $("#submit").text("Highlight Emojis");
    fb_instance_stream.push({username:username, m:$("#submission input").val(), c: my_color, user:currentUser.name(), profile:profileVideo, emojis: emojis});
    emojis = [];
    $("#submission input").prop('disabled', false);
    $("#textInput").unbind('mouseup');
    $("#submission input").val("");
    $("#emojiList").html("");
    $("#instructions").html("");
    firstKey = true;
    scroll_to_bottom(0);
  }

  function connect_to_chat_firebase(){
    /* Include your Firebase link here!*/
    fb_instance = new Firebase("https://pick-meyers-1.firebaseio.com");

    // generate new chatroom id or use existing id
    var url_segments = document.location.href.split("/#");
    if(url_segments[1]){
      fb_chat_room_id = url_segments[1];
    }else{
      fb_chat_room_id = Math.random().toString(36).substring(7);
    }
    display_msg({m:"Share this url with your friend to join this chat: "+ document.location.origin+"/#"+fb_chat_room_id,c:"red"})

    // set up variables to access firebase data structure
    chat_room_id = fb_chat_room_id;
    var fb_new_chat_room = fb_instance.child('chatrooms').child(fb_chat_room_id);
    var fb_instance_users = fb_new_chat_room.child('users');
    var fb_instance_stream = fb_new_chat_room.child('stream');
    var my_color = "#"+((1<<24)*Math.random()|0).toString(16);

    // listen to events
    fb_instance_users.on("child_added",function(snapshot){
      display_msg({m:snapshot.val().name+" joined the room",c: snapshot.val().c});
    });
    fb_instance_stream.on("child_added",function(snapshot){
      display_msg(snapshot.val(), snapshot.name());
    });

    // block until username is answered
    var username = window.prompt("Welcome, warrior! please declare your name?");
    if(!username){
      username = "anonymous"+Math.floor(Math.random()*1111);
    }

    currentUser = fb_instance_users.push({ name: username,c: my_color});
    $("#waiting").remove();

    // bind submission box

    $("#submit").click(function(){
      if($(this).text() == "Highlight Emojis" && $("#submission input").val() != "" ){
        startHighlighting();
      }
      else if($(this).text() == "Send Message"){
        sendMessage(fb_instance_stream, username, my_color);
      }
    });

    $(document).keydown(function( event ) {
      if (event.which == 13 && !$("#submission input").prop('disabled') && $("#submission input").val() != "" ) {
        startHighlighting();
      } else if (event.which == 13 && $("#submission input").prop('disabled')){
        sendMessage(fb_instance_stream, username, my_color);
      } else if (firstKey || !profileVideo){
        recordVideo();
        firstKey = false;
        setTimeout(function(){
          profileVideo = cur_video_blob;
        }, 1500);
      }
    });

    // scroll to bottom in case there is already content
    scroll_to_bottom(1300);
  }

  function isNewEmoji(newEmoji, emojis){
    for (var index in emojis){
      var emoji = emojis[index];
      if (emoji.str == newEmoji) return false;
    }

    return true;
  }

  // creates a message node and appends it to the conversation
  function display_msg(data, msgID){
    var profilePicString = "";

    if (data.profile){
      profilePicString = "<video width='120' src='"+URL.createObjectURL(base64_to_blob(data.profile))+"'></video>";
    }

    var convertString = function(message, emojis){
      if (emojis && message){
        for (var elem in emojis){
          var emoji = emojis[elem];
          if (emoji.video){
            var index = message.indexOf(emoji.str);
            if (index != -1){
              var leftM = message.substring(0, index);
              var rightM = message.substring(index+emoji.str.length, message.length);

              return convertString(leftM, emojis)+"<span class='hoverShow' style='color:"+emoji.color+"'><b>"+emoji.str+"</b><video width='100' src='"+URL.createObjectURL(base64_to_blob(emoji.video))+"' autoplay loop hidden></video></span>"+convertString(rightM, emojis);
            }
          }
        }
      }

      return message;
    }

    var convertedMessageString = convertString(data.m, data.emojis);
    console.log("Converted String: "+convertedMessageString);

    if (data.username) $("#conversation").append("<div class='msg' style='color:"+data.c+"'>"+profilePicString+data.username+": "+convertedMessageString+"</div>");
    else $("#conversation").append("<div class='msg' style='color:"+data.c+"'>"+data.m+"</div>");
    
    $(".hoverShow").hover(function(){$(this).children('video').show("fast");}, function(){$(this).children('video').hide("fast");});

    if(data.v){
      // for video element
      var video = document.createElement("video");
      video.autoplay = true;
      video.controls = false; // optional
      video.loop = true;
      video.width = 120;

      var source = document.createElement("source");
      source.src =  URL.createObjectURL(base64_to_blob(data.v));
      source.type =  "video/webm";

      video.appendChild(source);

      // for gif instead, use this code below and change mediaRecorder.mimeType in onMediaSuccess below
      // var video = document.createElement("img");
      // video.src = URL.createObjectURL(base64_to_blob(data.v));

      document.getElementById("conversation").appendChild(video);
    }
  }

  function scroll_to_bottom(wait_time){
    // scroll to bottom of div
    setTimeout(function(){
      $("html, body").animate({ scrollTop: $(document).height() }, 200);
    },wait_time);
  }

  function connect_webcam(){
    // we're only recording video, not audio
    var mediaConstraints = {
      video: true,
      audio: false
    };

    // callback for when we get video stream from user.
    var onMediaSuccess = function(stream) {
      // create video element, attach webcam stream to video element
      var video_width= 160;
      var video_height= 120;
      var webcam_stream = document.getElementById('webcam_stream');
      var video = document.createElement('video');
      webcam_stream.innerHTML = "";
      // adds these properties to the video
      video = mergeProps(video, {
          controls: false,
          width: video_width,
          height: video_height,
          src: URL.createObjectURL(stream)
      });
      video.play();
      webcam_stream.appendChild(video);

      // counter
      var time = 0;
      var second_counter = document.getElementById('second_counter');
      var second_counter_update = setInterval(function(){
        second_counter.innerHTML = time++;
      },1000);

      // now record stream in 5 seconds interval
      var video_container = document.getElementById('video_container');
      mediaRecorder = new MediaStreamRecorder(stream);
      var index = 1;

      mediaRecorder.mimeType = 'video/webm';
      // mediaRecorder.mimeType = 'image/gif';
      // make recorded media smaller to save some traffic (80 * 60 pixels, 3*24 frames)
      mediaRecorder.video_width = video_width/2;
      mediaRecorder.video_height = video_height/2;

      // var isFirstBlob = true;
      mediaRecorder.ondataavailable = function (blob) {
          //console.log("new data available!");
          video_container.innerHTML = "";

          // convert data into base 64 blocks
          blob_to_base64(blob,function(b64_data){
            cur_video_blob = b64_data;
          });
      };
      
      console.log("connect to media stream!");
    }

    // callback if there is an error when we try and get the video stream
    var onMediaError = function(e) {
      console.error('media error', e);
    }

    // get video stream from user. see https://github.com/streamproc/MediaStreamRecorder
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
  }

  // check to see if a message qualifies to be replaced with video.
  var has_emotions = function(msg){
    var options = ["lol",":)",":("];
    for(var i=0;i<options.length;i++){
      if(msg.indexOf(options[i])!= -1){
        return true;
      }
    }
    return false;
  }


  // some handy methods for converting blob to base 64 and vice versa
  // for performance bench mark, please refer to http://jsperf.com/blob-base64-conversion/5
  // note useing String.fromCharCode.apply can cause callstack error
  var blob_to_base64 = function(blob, callback) {
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      callback(base64);
    };
    reader.readAsDataURL(blob);
  };

  var base64_to_blob = function(base64) {
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([view]);
    return blob;
  };
})();
