// ==UserScript==
// @name          Specatator Mode
// @namespace     http://reddit.com/u/samwilber
// @updateURL     https://github.com/mcgrogan91/TagProScripts/raw/master/specmode.user.js
// @description   Never accidentally join a game again
// @include       http://tangent.jukejuice.com*
// @include       http://tagpro-*.koalabeast.com*
// @author        turtlemansam and help from bizkut's script
// @contributor   bizkut
// @contributor   OmicroN
// @version       2.2
// @grant         GM_getValue
// @grant         GM_setValue
// ==/UserScript==

function querystring(name, url) {
    if (!url) url = window.location.href;

    name = name.replace(/[\[\]]/g, "\\$&");

    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
    var results = regex.exec(url);

    if (!results) return null;
    if (!results[2]) return '';

    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

$(document).ready(function(){
    if(document.URL.endsWith(".com/") === true || document.URL.endsWith("/?spectator=true") === true ) {
        $('#play-now').parent().append("<br/><input type='checkbox' id='tglSpec'> Spectator Mode</input>");
        $('#optionsName').append("<input type='checkbox' id='tglSpec'>Spectator Mode</input>");
    }

    if (GM_getValue("specMode") === true) {
        $("#tglSpec").prop('checked', true);
    }

    $("#tglSpec").on('change', function () {
        if ($(this).is(":checked")) {
            GM_setValue("specMode", true);
        } else {
            GM_setValue("specMode", false);
        }
    });

    if (GM_getValue("specMode") === true) {
        if(document.URL.search('games/find') >= 0) {
        window.location.href = "/";
        }
    }

    if (querystring('target'))
    {
        tagpro.ready(function() {
            var gameloaded;

            gameloaded = setInterval(function() {
                if ( ! $.isEmptyObject(tagpro.players)) {
                    clearInterval(gameloaded);

                    for (var playerId in tagpro.players) {
                        if (tagpro.players[playerId].name.toLowerCase() == querystring('target').toLowerCase()) {
                            tagpro.playerId = playerId;

                            break;
                        }
                    }
                }
            }, 100);
        });
    }
});
