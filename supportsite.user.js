// ==UserScript==
// @name         Support Site Helper
// @namespace    http://www.reddit.com/u/bizkut
// @updateURL    https://github.com/mcgrogan91/TagProScripts/raw/master/supportsite.user.js
// @version      1.0
// @description  Adds Good Standing button for default Good Standing reply.  Other button texts provided by Turtlemansam
// @author       Bizkut
// @include      http://support.koalabeast.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

//NOTE, CHANGE THIS TO THE NAME YOU WANT DISPLAYED AT THE END OF SOME MESSAGES
//IF YOU DONT YOU WILL LOOK LIKE A JERK
var modName = "A TagPro Moderator";

//First commented out line is the template for adding more buttons.
var buttons = {
    //'unique_value': ['Button Text', 'This text gets put into the text'],
    'standing_message': ['Good Standing',"Hi Some Ball,\n\nYou're playing on a shared IP that has been banned. To bypass this, you need an account in good standing.\n\n**Good Standing Requirements:**\n\n - A registered account ✓\n - Minimum 5 hours playtime\n - Maximum of 2 reports in past 24 hours\n\n*Please let us know if you have any further questions or concerns.*\n\n\- "+modName],
    'start_message': ['Start Format', "Hi Some Ball,\n\nMessage Here\n\n*Please let us know if you have any further questions or concerns.*\n\n\- "+modName],
    'afk_message': ['AFK Too Much', "Hi Some Ball,\n\nYou were banned for receiving 8 reports within 24 hours. Most of these reports are for not moving for 30 seconds, and getting kicked by the AFK timer. Please try to stay active in-game, and click the exit button if you need to leave. Also, try not to switch tabs inbetween games, because you might end up in a game and not realize it!\n\n*Please let us know if you have any further questions or concerns.*\n\n\- "+modName],
    'chat_message': ['Offensive Chat', "Hi Some Ball,\n\nYou were banned for your chat:\n\nChat Here!\n\n*Please let us know if you have any further questions or concerns.*\n\n\- "+modName],
    'no_account_message': ['No Profile ID', "Hi Some Ball,\n\nCan you please tell us your account name or your profile ID? Without this we have no idea who you are.\n\nIf you don't have an account, the only way you can play on a banned IP is through an account in Good Standing.\n\n**Good Standing Requirements:**\n\n - A registered account\n - Minimum 5 hours playtime\n - Maximum of 2 reports in past 24 hours\n\n*Please let us know if you have any further questions or concerns.*\n\n\- "+modName]
};
function makeButtons(){
    for (var key in buttons) {
        if (buttons.hasOwnProperty(key)) {
            if(!$("#"+key).length) {
                var item  =  $('<button id='+key+' class="btn btn-primary pull-right">'+buttons[key][0]+'</button>');
                item.on('click', function() {
                    $("#comment_text").val(buttons[this.id][1]);
                    $("#comment_preview").html(Autolinker.link(markdown.toHTML(buttons[this.id][1])))
                });
                $("#submit_comment").after(item);
            }
        }
    }
}
setInterval(makeButtons,1000);

$(window).on('load hashchange', function(e){
    findAppealAccount();
});

function findAppealAccount() {
    if ($('div#main').length == 0) {
        setTimeout(findAppealAccount, 400);
        return;
    }
    var profileIDLink = $("a[href^='http://tagpro-origin.koalabeast.com/moderate/users/']");
    if (window.location.hash.indexOf('/ticket/') > 0) {
        if (profileIDLink.length > 0) {
            var profileAddress = profileIDLink[0].href;
            if (profileAddress.substring(profileAddress.lastIndexOf("/")+1).length > 0) {
                GM_xmlhttpRequest({
                      method: "GET",
                      url: profileAddress,
                      onload: function(response) {
                          var response = $(response.response);
                          var reserved = response.find("label:contains('Reserved Name')").next().text();
                          var display = response.find("label:contains('Display Name')").next().text();
                          var goodstanding = response.find("label:contains('Good Standing')").next().text();
                          var currentban = response.find("label:contains('Current Ban')").next().text();
                          var lastmodaction = response.find("h2:contains('Moderate Bans')").next().text();
                          var lastreports = response.find('.removeReport').prev().map(function() { return $(this).text() }).get().join(', ');
                          
                          if (lastmodaction == 'Recent Reports (24 hours)') lastmodaction = '';

                          if (reserved || display) {
                              showNames(reserved, display, goodstanding, currentban, lastmodaction, lastreports);
                          }
                      }
                });
            }
        }
    }
}

function showNames(reserved, display, goodstanding, currentban, lastmodaction, lastreports) {
    if (!reserved || reserved.length === 0) {
      reserved = "<em>Could not find Reserved Name</em>";
    }
    if (!display || display.length === 0) {
      display = "<em>Could not find Display Name</em>";
    }
    $("div#main>div>hr").before("<br/><span id='showing_display_name'><strong>Display Name</strong>: "+display+"</span>");
    $("div#main>div>hr").before("<br/><span id='showing_reserved_name'><strong>Reserved Name</strong>: "+reserved+"</span>");
    $("div#main>div>hr").before("<br/><span id='showing_good_standing'><strong>Good Standing</strong>: "+goodstanding+"</span>");
    $("div#main>div>hr").before("<br/><span id='showing_current_ban'><strong>Current Ban</strong>: "+currentban+"</span>");
    $("div#main>div>hr").before("<br/><span id='showing_last_mod_action'><strong>Last Mod Action</strong>: "+lastmodaction+"</span>");
    $("div#main>div>hr").before("<br/><span id='showing_last_reports'><strong>Last Reports (24 hours)</strong>: "+lastreports+"</span>");
}
