// ==UserScript==
// @name          Autoload Timer
// @namespace     http://reddit.com/u/bizkut
// @updateURL     https://github.com/mcgrogan91/TagProScripts/raw/master/autoload.user.js
// @description   Prevents you from auto-playing another game if X minutes are up
// @include       http://tangent.jukejuice.com*
// @include       http://tagpro-*.koalabeast.com*
// @author        bizkut
// @version       1.0.0
// @grant         GM_getValue
// @grant         GM_setValue
// ==/UserScript==

// The number of minutes you let yourself play
var timeToPlay = 30;

$(document).ready(function(){
    var timeDifference = function() {
        var started = GM_getValue("timerStarted");
        if (started) {
            var startTime = new Date(started).getTime();
            var expireAt = new Date(startTime + (timeToPlay * 60000)).getTime();
            var now = new Date().getTime();
            return expireAt - now;
        }
        return false;
    };

    var setButton = function() {
        var buttonText = null;
        if (GM_getValue("timerOn") === true) {
            var difference = timeDifference(),
                minutes = Math.ceil(difference / 60000);
            buttonText = "Stop Timer - (" + minutes + " minutes)";
        } else {
            buttonText = "Start Timer - (" + timeToPlay + " minutes)";
        }
        $("#timerButton").text(buttonText);
    };

    if(document.URL.endsWith(".com/") === true) {
        $('#play-now').parent().append("<br/><button class='btn btn-primary' id='timerButton'></button>");
        setButton();
        setInterval(setButton, 10000);
    }

    $("#timerButton").on('click', function () {
        var turnOn = (!GM_getValue("timerOn") === true);
        GM_setValue("timerOn", turnOn);
        GM_setValue("timerStarted", turnOn? new Date() : null);
        setButton();
    });

    if (GM_getValue("timerOn") === true) {
        if(document.URL.search('games/find') >= 0) {
            if (timeDifference() < 0) {
                GM_setValue('timerStarted', null);
                GM_setValue('timerOn', false);
                setButton();
                window.location.href = "/";
            }
        }
    }

});
