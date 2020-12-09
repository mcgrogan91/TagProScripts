// ==UserScript==
// @name         Support Site Helper
// @namespace    http://www.reddit.com/u/bizkut
// @updateURL    https://github.com/mcgrogan91/TagProScripts/raw/master/supportsite.user.js
// @version      2.0.0
// @description  Canned responses for the most common scenarios, displays ban information from the mod tools based on profileid, integrated wysiwyg markdown editor for easy formating of responses (includes a autosave feature of draft messages), fixes the text/url of those who enter full url's as there profileid rather then just the id itself while making those who enter there name as profile id display as plain text and not a clickable link...
// @author       Bizkut
// @contributor  OmicroN
// @kinda helped Anne Frank
// @include      https://support.koalabeast.com/*
// @include      http://support.koalabeast.com/*
// @require      https://code.jquery.com/jquery-3.5.1.min.js
// @require      https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.js
// ==/UserScript==

// Grabs username from the nav menu.  If not logged in it will be null.
var modName = $(".navigation a[href^='http']")?.text();

// Name of the user who submitted the ticket, this will be set automatically to the ticket users display name if a proper profileid was entered
var appealName = $(".ticket-username").text().slice(0, -17);
if (appealName == 'Ticket Creator') {
    appealName = 'Some Ball';
}

// First commented out line is the template for adding more buttons.
var buttons = {
    //'unique_value': ['Button Text', 'This text gets put into the text'],
    'standing_message': {
        'button': 'Good Standing',
        'text': "Hi ##appealName##,\n\nYou're playing on a shared IP that has been banned. To bypass this, you need an account in good standing.\n\n**Good Standing Requirements:**\n\n - A registered account ✓\n - Minimum 5 hours playtime\n - Maximum of 2 reports in past 24 hours\n\n*Please let us know if you have any further questions or concerns.*\n\n\Regards, "+modName
    },
    'start_message': {
        'button': 'Start Format',
        'text': "Hi ##appealName##,\n\nMessage Here\n\n*Please let us know if you have any further questions or concerns.*\n\n\Regards, "+modName
    },
    'afk_message': {
        'button': 'AFK Too Much',
        'text': "Hi ##appealName##,\n\nYou were banned for receiving 8 reports within 24 hours. Most of these reports are for not moving for 30 seconds, and getting kicked by the AFK timer. Please try to stay active in-game, and click the exit button if you need to leave. Also, try not to switch tabs inbetween games, because you might end up in a game and not realize it!\n\n*Please let us know if you have any further questions or concerns.*\n\n\Regards, "+modName
    },
    'chat_message': {
        'button': 'Offensive Chat',
        'text': "Hi ##appealName##,\n\nYou were muted for your chat:\n\n[Chat Here!]\n\n*Please let us know if you have any further questions or concerns.*\n\n\Regards, "+modName
    },
    'no_account_message': {
        'button': 'No Profile ID',
        'text': "Hi ##appealName##,\n\nCan you please tell us your account name or your profile ID? Without this we have no idea who you are.\n\nIf you don't have an account, the only way you can play on a banned IP is through an account in Good Standing.\n\n**Good Standing Requirements:**\n\n - A registered account\n - Minimum 5 hours playtime\n - Maximum of 2 reports in past 24 hours\n\n*Please let us know if you have any further questions or concerns.*\n\n\Regards, "+modName
    },
};

var simplemde, commentLoadedInterval, simpleMDEInterval;

// Added dom ready state check because window.load event doesn't fire when you navigate away from a page then go back in your browser history
$(document).ready(function() {
    if ($(".pill-open") && $("button[type='submit']")) {

        $('head').append('<link rel="stylesheet" href="//cdn.jsdelivr.net/simplemde/latest/simplemde.min.css" />');
        var submit = $("button[type='submit']");
        submit.after('<div class="row"></div>');

        simplemde = new SimpleMDE({
            forceSync: true,
            autosave: {
                enabled: true,
                uniqueId: location.href.substr(location.href.lastIndexOf('/') + 1),
                delay: 1000,
            },
            hideIcons: ['guide', 'fullscreen', 'side-by-side', 'preview'],
            promptURLs: true,
            status: ['autosave', 'lines', 'words'],
            tabSize: 4,
            toolbar: ['bold', 'italic', 'heading', '|', 'quote', 'horizontal-rule', '|', 'unordered-list', 'ordered-list', {
                name: "clear",
                action: function(editor) {
                    simplemde.value('');
                    simplemde.clearAutosavedValue();
                },
                className: "fa fa-eraser",
                title: "Clear Form & Autosaved Data",
            }],
            spellChecker: false,
        });

        for (var key in buttons) {
            var item  =  $('<button id=' + key + ' class="btn btn-info pull-right" style="margin-left: 2px;">' + buttons[key].button + '</button>');
            item.on('click', function() {
                simplemde.value(buttons[this.id].text.replace('##appealName##', appealName));
                return false;
            });

            submit.after(item);
        }
        submit.css('marginLeft', '20px');
    }
});
