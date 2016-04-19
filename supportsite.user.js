// ==UserScript==
// @name         Support Site Helper
// @namespace    http://www.reddit.com/u/bizkut
// @updateURL    https://github.com/mcgrogan91/TagProScripts/raw/master/supportsite.user.js
// @version      1.1.2
// @description  Canned responses for the most common scenarios, displays ban information from the mod tools based on profileid, integrated wysiwyg markdown editor for easy formating of responses (includes a autosave feature of draft messages), fixes the text/url of those who enter full url's as there profileid rather then just the id itself while making those who enter there name as profile id display as plain text and not a clickable link...
// @author       Bizkut
// @contributor  OmicroN
// @include      http://support.koalabeast.com/*
// @connect      koalabeast.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

// THIS WILL BY DEFAULT NOW GRAB THE NAME YOUR LOGGED IN NOW TO APPEND/SIGNATURE CERTAIN MESSAGES INSTEAD OR USE THE DEFAULT 'A TagPro Moderator'
var modName = $('.dropdown-toggle').length ? $('.dropdown-toggle').text() : "A TagPro Moderator";

// Name of the user who submitted the ticket, this will be set automatically to the ticket users display name if a proper profileid was entered
var appealName = 'Some Ball';

// First commented out line is the template for adding more buttons.
var buttons = {
    //'unique_value': ['Button Text', 'This text gets put into the text'],
    'standing_message': ['Good Standing',"Hi ##appealName##,\n\nYou're playing on a shared IP that has been banned. To bypass this, you need an account in good standing.\n\n**Good Standing Requirements:**\n\n - A registered account ✓\n - Minimum 5 hours playtime\n - Maximum of 2 reports in past 24 hours\n\n*Please let us know if you have any further questions or concerns.*\n\n\Regards, "+modName],
    'start_message': ['Start Format', "Hi ##appealName##,\n\nMessage Here\n\n*Please let us know if you have any further questions or concerns.*\n\n\Regards, "+modName],
    'afk_message': ['AFK Too Much', "Hi ##appealName##,\n\nYou were banned for receiving 8 reports within 24 hours. Most of these reports are for not moving for 30 seconds, and getting kicked by the AFK timer. Please try to stay active in-game, and click the exit button if you need to leave. Also, try not to switch tabs inbetween games, because you might end up in a game and not realize it!\n\n*Please let us know if you have any further questions or concerns.*\n\n\Regards, "+modName],
    'chat_message': ['Offensive Chat', "Hi ##appealName##,\n\nYou were banned for your chat:\n\nChat Here!\n\n*Please let us know if you have any further questions or concerns.*\n\n\Regards, "+modName],
    'no_account_message': ['No Profile ID', "Hi ##appealName##,\n\nCan you please tell us your account name or your profile ID? Without this we have no idea who you are.\n\nIf you don't have an account, the only way you can play on a banned IP is through an account in Good Standing.\n\n**Good Standing Requirements:**\n\n - A registered account\n - Minimum 5 hours playtime\n - Maximum of 2 reports in past 24 hours\n\n*Please let us know if you have any further questions or concerns.*\n\n\Regards, "+modName]
};

var simplemde, commentLoadedInterval, simpleMDEInterval;

$('head').append('<link rel="stylesheet" href="//cdn.jsdelivr.net/simplemde/latest/simplemde.min.css" />');
$('head').append('<script src="//cdn.jsdelivr.net/simplemde/latest/simplemde.min.js"></script>');

// Added dom ready state check because window.load event doesn't fire when you navigate away from a page then go back in your browser history
$(document).ready(function() {
    main();

    // When navigating away from the site and hitting browser back, the ajax on a page is already loaded before this event is set and fired so we need to manually fire it here 
    $(document).trigger('ajaxComplete');
});

$(window).on('hashchange', function() {
    main();
});

function main() {
    // Open/Closed ticket listing
    if (location.hash == '#/tickets/closed' || location.hash == '#/tickets') {
        // Using ajaxComplete event rather then on hash change because hash change can fire before the results and text on the page changes, since the ticket listing page
        // auto refreshes every couple of seconds we need this even just when on the tickets open/closed page
        $(document).on('ajaxComplete', function() {
            $("a[href^='http://tagpro-origin.koalabeast.com/moderate/users/']").each(function() {
                var profileText = $(this).text();

                // Fix for those who put full url for profile id when filling out ticket
                if (profileText.length > 24) {
                    profileText = profileText.substr(profileText.lastIndexOf('/') + 1);

                    if (profileText.length == 24) {
                        $(this).html(profileText);
                        $(this).attr('href', 'http://tagpro-origin.koalabeast.com/moderate/users/' + profileText);
                    } else {
                        $(this).parent().html(profileText);
                    }
                } else if (profileText.length < 24) {
                    $(this).parent().html(profileText);
                }
            });
        });
    }

    // Individual ticket
    if (location.hash.indexOf('/ticket/') > 0) {
        // We need to disable the ajax complete event when viewing a ticket because it causes an infinite loop with the ajax call that pulls the ban information
        $(document).off('ajaxComplete');

        commentLoadedInterval = setInterval(function() {
            if ($('#status').text() == 'Open' && $("#submit_comment").length) {
                clearInterval(commentLoadedInterval);

                findAppealAccount();

                $("#submit_comment").after('<div class="row"></div>');

                for (var key in buttons) {
                    if (buttons.hasOwnProperty(key)) {
                        if(!$("#"+key).length) {
                            var item  =  $('<button id=' + key + ' class="btn btn-info pull-right" style="margin-left: 2px;">' + buttons[key][0] + '</button>');

                            item.on('click', function() {
                                simplemde.value(buttons[this.id][1].replace('##appealName##', appealName));
                            });

                            $("#submit_comment").after(item);
                        }
                    }
                }

                $('#submit_comment').css('marginLeft', '20px');

                simpleMDEInterval = setInterval(function() {
                    if (typeof SimpleMDE != 'undefined')
                    {
                        clearInterval(simpleMDEInterval);

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
                            toolbar: ['bold', 'italic', 'heading', '|', 'quote', 'horizontal-rule', '|', 'unordered-list', 'ordered-list', '|', 'link', 'image', '|', {
                                name: "clear",
                                action: function(editor) {
                                    simplemde.value('');
                                    simplemde.clearAutosavedValue();
                                },
                                className: "fa fa-eraser",
                                title: "Clear Form & Autosaved Data",
                            }],
                        });

                        simplemde.codemirror.on('change', function() {
                            $('#comment_preview').html(Autolinker.link(markdown.toHTML(simplemde.value())));
                        });
                    }
                }, 100);

                if ($('#login_link').length) {
                    $('#comment_section div').html('<h4 style="color: red;">Responding Disabled - Not Logged In</h4>');
                }
            } else if ($('#status').text() == 'Closed') {
                clearInterval(commentLoadedInterval);

                findAppealAccount();
            }
        }, 100);
    }
}

function findAppealAccount() {
    var profileIDLink = $("a[href^='http://tagpro-origin.koalabeast.com/moderate/users/']");

    appealName = 'Some Ball';

    if (profileIDLink.length > 0) {
        var profileText = profileIDLink.text();

        // Fix for those who put full url for profile id when filling out ticket
        if (profileText.length > 24) {
            profileText = profileText.substr(profileText.lastIndexOf('/') + 1);

            if (profileText.length == 24) {
                profileIDLink.html(profileText);
                profileIDLink.attr('href', 'http://tagpro-origin.koalabeast.com/moderate/users/' + profileText);
            } else {
                profileIDLink.after(profileText).remove();
            }
        } else if (profileText.length < 24) {
            profileIDLink.after(profileText).remove();
        }

        var profileAddress = 'http://tagpro-origin.koalabeast.com/moderate/users/' + profileText;

        if (profileText.length == 24) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: profileAddress,
                onload: function(response) {
                    response = $(response.response);

                    var reserved = response.find("label:contains('Reserved Name')").next().text();
                    var display = response.find("label:contains('Display Name')").next().text();
                    var goodstanding = response.find("label:contains('Good Standing')").next().text();
                    var currentban = response.find("label:contains('Current Ban')").next().text();
                    var lastmodaction = response.find("h2:contains('Moderate Bans')").next().text();
                    var lastreports = response.find('.removeReport').prev().map(function() { return $(this).text(); }).get().join(', ');

                    appealName = display;

                    if (lastmodaction == 'Recent Reports (24 hours)') lastmodaction = '';

                    if (reserved || display) {
                        showNames(reserved, display, goodstanding, currentban, lastmodaction, lastreports);
                    }
                }
            });
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
