// ==UserScript==
// @name         Mod Tools Helper
// @namespace    http://www.reddit.com/u/bizkut
// @updateURL    https://github.com/mcgrogan91/TagProScripts/raw/master/modtools.user.js

// @version      1.7.0
// @description  It does a lot.  And then some.  I'm not even joking.  It does too much.
// @author       Bizkut
// @contributor  OmicroN
// @contributor  Carbon
// @include      http://tagpro-*.koalabeast.com/moderate/*
// @include      https://tagpro.koalabeast.com/moderate/*
// @include      http://tangent.jukejuice.com/moderate/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/crosstab/0.2.12/crosstab.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addValueChangeListener
// ==/UserScript==

var bizAPI = "https://kylemcgrogan.com/api/";
var commentAPI = bizAPI + "comments/";
var evasionAPI = bizAPI + "evasion/";

var getActionURL = function(id, type, actionType) {
    return document.location.origin + '/moderate/' + type + '/' + id + '/' + actionType;
}

var banAction = function(id, type, count, reason, callback) {
    $.post(getActionURL(id, type, 'ban'), {
        reason: reason,
        banCount: count
    }, callback);
}

var unbanAction = function(id, type, callback) {
    $.post(getActionURL(id, type, 'unban'), callback);
}

var muteAction = function(id, type, callback) {
    $.post(getActionURL(id, type, 'mute'), callback);
}

var unmuteAction = function(id, type, callback) {
    $.post(getActionURL(id, type, 'unmute'), callback);
}

var setEvasionProfileHeader = function(total, remaining, action) {
    var percentRemaining = (total-remaining)/total*100;
    document.getElementById("evasionProfileHeader").innerText = "Evasion Profile - "+action+" - "+percentRemaining.toFixed(1)+"% complete";
    document.title = "Action In Progress";
}

var evasionSection = function() {
    var isProfile = window.location.href.indexOf("users/") > 0;
    var isIP = window.location.href.indexOf("ips/") > 0;
    if (!(isProfile || isIP)) return;

    var pageId = window.location.href.substring(window.location.href.lastIndexOf("/") + 1);
    var route = 'evasion_profile';

    if (isIP) {
        route = 'evasion_ips';

        /////////////// GRAB SPECTATOR LINK FOR UNREGISTERED USERS

        // start with getting the ip
        var ip = $('label:contains("IP Address")').next().text();

        // search the last 15 min of activity to see if still possibly playing
        $.getJSON(document.location.origin + '/moderate/chat?hours=0.25&ip=' + ip, function(data) {
            if (Object.keys(data).length) {
                // user the latest activity to calculate last activity
                var lastActivity = (((new Date()).getTime() - (new Date(data[0].when)).getTime()) / 1000 / 60 * 0.0166).toFixed(1);

                $('label:contains("IP Address")').parent().after('<div><label class="inline">Recent Activity</label><span class="ipchecked">' + lastActivity + ' hours ago</span></div>');

                var users = {};

                // loop through last 15 min of activity and find any
                Object.keys(data).forEach(function(item, index) {
                    if (typeof users[data[index].displayName] === 'undefined') {
                        users[data[index].displayName] = data[index].gameId;
                    }
                });

                // search found active users in last 15 minutes
                if (Object.keys(users).length) {
                    // search active games list
                    $.getJSON(document.location.origin + '/moderate/games', function(data4) {
                        // search through last active users/games
                        Object.keys(users).forEach(function(name, index) {
                            var gameId = users[name];
                            var someName = name;

                            // if last active users game is found in the current active games list then appaend spectator link to page
                            Object.keys(data4).forEach(function(item, index) {
                                if (data4[index].gameId == gameId) {
                                    if (data4[index].spectateUrl) {
                                        $('form:first').after('<a href="' + data4[index].spectateUrl + '&amp;target=' + someName + '" target="_blank" class="button tiny ipchecked">Spectate ' + someName + '</a>');
                                    }

                                    return;
                                }
                            });
                        });
                    });
                }
            }
        });
        //////////////////////////
    } else {
        var speclink = $('a:contains("Spectate")');
        speclink.attr('href', speclink.attr('href') + '&target=' + encodeURIComponent($('label:contains("Display Name")').next().text()));
    }

    $.get(evasionAPI + "find_evader/" + pageId, {}, function(response) {
        $('head').append('<style> .evasionSection { float:right; width:60%; border-left: 1px solid #fff; padding-left:20px;} .pad {padding: 10px;} .indent {padding-left:10px;}</style>');
        var evasionSection = $("<div class='evasionSection'/>"),
            addAccount,
            addIP;

        if (response.length == 0) {
            var newEvasionProfile = $('<button id="newProfile" class="small">Make new Ban Evasion Profile</button>');
            newEvasionProfile.on('click', function() {
                $.post(evasionAPI + route, {account_id:pageId}, function(res) {
                    location.reload();
                });
            });

            evasionSection.append(newEvasionProfile);
        }

        if ((response.length == 0 && isProfile) || isIP) {
            var existingEvasionProfile = $('<button id="existingProfile" class="small">Add to existing Ban Evasion Profile</button>');
            existingEvasionProfile.on('click', function() {
                var evasionId = prompt("Enter profile ID of evader", "");
                if (evasionId != "" && evasionId != null) {
                    $.post(evasionAPI + route, {account_id:pageId, existing_id:evasionId}, function(res) {
                        location.reload();
                    });
                }
            });
            evasionSection.append(existingEvasionProfile);
        }

        var evasionAccounts = $("<div/>");
        response.forEach(function(banProfile, index, array) {
            var evasionAccount = $("<div class='pad'/>");
            evasionAccount.append("<h2 id='evasionProfileHeader'>Evasion Profile</h2>");
            var evasionButtonToolTips = {
                ban:    "Accounts and IPs linked to the evasion profile have their ban count increased by 1.\nThe ban reason is \"ban evasion\".",
                unban:  "Accounts and IPs linked to the evasion profile have their ban count decreased by 1.",
                mute:   "Accounts linked to the evasion profile have their mute count increased by 1.\nIPs linked to the evasion profile have their ban count increased by 1.",
                unmute: "Accounts linked to the evasion profile have their mute count decreased by 1.\nIPs linked to the evasion profile have their ban count decreased by 1."
            };
            var evasionBanButton = $("<button class='small' title='"+evasionButtonToolTips['ban']+"'>Ban</button>");
            var evasionUnbanButton = $("<button class='small' title='"+evasionButtonToolTips['unban']+"'>Unban</button>");
            var evasionMuteButton = $("<button class='small' title='"+evasionButtonToolTips['mute']+"'>Mute</button>");
            var evasionUnmuteButton = $("<button class='small' title='"+evasionButtonToolTips['unmute']+"'>Unmute</button>");
            var banEvasionReason = 7; //This is hacky as shit.  I should probably search the ban reason list for the id but i'm drunk coding.
            var accountBanListTotal; //Set at the end of the forEach, accountBanList needs to be populated
            var userMuteListTotal; //Set at the end of the forEach, usersOnlyList needs to be populated
            var addAction = false; //If you can get the callback w/parameter working, please change this so addAction isn't used.
            var evasionBanAction = function() {
                if (accountBanList.length != 0) {
                    setEvasionProfileHeader(accountBanListTotal, accountBanList.length, (addAction ? "Ban" : "Unban"));
                    var profile = accountBanList.pop();
                    if(addAction) {
                        var banCount = parseInt(profile.el.attr('data-bancount'));
                        banAction(profile.id, profile.type, banCount + 1, banEvasionReason, evasionBanAction);
                    } else {
                        unbanAction(profile.id, profile.type, evasionBanAction);
                    }
                } else {
                    document.getElementById("evasionProfileHeader").innerText = "Evasion Profile - Complete, refreshing";
                    location.reload();
                }
            };
            var evasionMuteAction = function() {
                if (usersOnlyList.length != 0) {
                    setEvasionProfileHeader(userMuteListTotal, usersOnlyList.length, (addAction ? "Mute" : "Unmute"));
                    var profile = usersOnlyList.pop();
                    if(addAction) {
                        muteAction(profile.id, "users", evasionMuteAction);
                    } else {
                        document.getElementById("evasionProfileHeader").innerText = "Evasion Profile - Complete, refreshing";
                        unmuteAction(profile.id, "users", evasionMuteAction);
                    }
                } else {
                    location.reload();
                }
            };
            var accountBanList = [];

            evasionAccount.append(evasionBanButton);
            evasionAccount.append(evasionUnbanButton);
            evasionAccount.append(evasionMuteButton);
            evasionAccount.append(evasionUnmuteButton);
            if (banProfile.profiles.length > 0) {
                var accounts = $("<p class='evasion_accounts' class=''></p>");
                accounts.append("<h2 class='indent'>Accounts</h2>");
                var accountList = $("<ul class='indent'/>");

                banProfile.profiles.forEach(function(profile, i, a) {
                    var link = $("<a class='ban_profile_account' href='//" + window.location.hostname + "/moderate/users/" + profile.profile_id +"'>" + profile.profile_id +"</a>");
                    var removeAccount = $("<span class='removeAccount' data-id='"+profile.id+"'> ✗</span>");
                    accountBanList.push({
                        id: profile.profile_id,
                        type: 'users',
                        el: link
                    });
                    var list = $("<li class='indent'></li>");
                    list.append(link);
                    list.append(removeAccount);
                    accountList.append(list);
                });
                accounts.append(accountList);
                evasionAccount.append(accounts);
            }

            if (banProfile.ranges.length > 0) {
                var ips = $("<p class='evasion_ips' class='pad'></p>");
                ips.append("<h2 class='indent'>IPs</h2>");

                var ipList = $("<ul class='indent'/>");
                banProfile.ranges.forEach(function(ip, i, a) {
                    var link = $("<a class='ban_profile_ip' href='//" + window.location.hostname + "/moderate/ips/" + ip.tagpro +"'>" + ip.tagpro +"</a>");
                    var removeIP = $("<span class='removeIP' data-id='"+ip.id+"'> ✗</span>");
                    accountBanList.push({
                        id: ip.tagpro,
                        type: 'ips',
                        el: link
                    });
                    var list = $("<li class='indent'></li>");
                    list.append(link);
                    list.append(removeIP);

                    ipList.append(list);
                });
                ips.append(ipList);
                evasionAccount.append(ips);
            }
            evasionBanButton.on('click', function() {
                if (dinkProtect(true)) {
                    addAction = true;
                    evasionBanAction();
                }
            });
            evasionUnbanButton.on('click', function() {
                if (dinkProtect(true)) {
                    addAction = false;
                    evasionBanAction();
                }
            });

            evasionMuteButton.on('click', function() {
                evasionProfileButton(true);
            });
            evasionUnmuteButton.on('click', function() {
                evasionProfileButton(false);
            });

            var evasionProfileButton = function(addditive) {
                usersOnlyList = accountBanList.filter(function(e) {
                    return e.type === 'users'; //only users can be muted
                });
                accountBanList = accountBanList.filter(function(e) {
                    return e.type === 'ips'; //only ips should be banned
                });

                userMuteListTotal = usersOnlyList.length;
                accountBanListTotal = accountBanList.length;

                if (dinkProtect(true)) {
                    addAction = addditive;
                    evasionMuteAction();
                    evasionBanAction();
                }
            };

            accountBanListTotal = accountBanList.length;
            evasionAccounts.append(evasionAccount);
        });
        evasionSection.append(evasionAccounts);
        $('form').before(evasionSection);

        if (isProfile) {
            lastIP = $('label:contains("Last IP")').next().text();
        } else {
            lastIP = pageId;
        }

        $.get(evasionAPI + "suspicious/" + lastIP, {}, function(response) {
            if (response[2] || response[3]) {
                var suspiciousSection = $("<div class='pad' />");
                suspiciousSection.append('<h2>Similar Flagged IPs</h2>');
                if (response[3]) {
                    var ipList = $("<ul class='indent' />");
                    response[3].forEach(function(item) {
                        ipList.append("<li class='indent'><a href='//" + window.location.hostname + "/moderate/ips/" + item +"'>" + item +"</a></li>" );
                    });
                    ipList.prepend("<h2>Very Similar</h2>");
                    suspiciousSection.append(ipList);
                }

                if (response[2]) {
                    var ipList = $("<ul class='indent' />");
                    response[2].forEach(function(item) {
                        ipList.append("<li class='indent'><a href='//" + window.location.hostname + "/moderate/ips/" + item +"'>" + item +"</a></li>" );
                    });
                    ipList.prepend("<h2>Somewhat Similar</h2>");
                    suspiciousSection.append(ipList);
                }
            }
            $(".evasionSection").append(suspiciousSection);
        });

        $("a.ban_profile_account").each(function(index, element) {
            var el = $(element);
            colorAccountInfo(el);
        });

        $("a.ban_profile_ip").each(function(index, element) {
            var el = $(element);
            colorAccountInfo(el, false);
        });

        $('.removeAccount').on('click', function(el) {
            var accountId = $(this).data('id');
            $.ajax({
                url: evasionAPI + "evasion_profile/" + accountId,
                type: 'DELETE',
                success: function(){
                    var id = this.url.substring(this.url.lastIndexOf("/")+1);
                    $(".removeAccount[data-id='"+id+"']").parent().remove();
                }
            });
        });
        $('.removeIP').on('click', function(el) {
            var ipId = $(this).data('id');
            $.ajax({
                url: evasionAPI + "evasion_ips/" + ipId,
                type: 'DELETE',
                success: function(){
                    var id = this.url.substring(this.url.lastIndexOf("/")+1);
                    $(".removeIP[data-id='"+id+"']").parent().remove();
                }
            });
        });
    });
};

if (("Notification" in window)) {
    if (Notification.permission !== "granted" && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

var optionsLink = $('<a href="#" id="options">Options</a>');
var optionsPage = $("<div/>");
$("a[href='/moderate/modactions']").after(optionsLink);
optionsPage.append("SETTINGS!<br/><br/>");
optionsPage.append("<div><input type='checkbox' id='longTime' /><label for='longTime'>Full time on Chat Page (Adds seconds to times)</label></div><br/>");
optionsPage.append("<div><input type='checkbox' id='dinkProtect' /><label for='dinkProtect'>Enable dink protections (Requires verification to ban/unban)</label></div><br/>");
optionsPage.append("<div><input type='checkbox' id='communityAlert' /><label for='communityAlert'>Community Alerts (Triggers notifications on Community Ban Appeals)</label></div><br/>");
optionsPage.append("<div><input type='checkbox' id='reportCounter' /><label for='reportCounter'>Disable active reports counter in the Recent Reports header</label></div><br/>");
var countSelect = "<select id='commonCount'>";
for(var amount = 0; amount < 10; amount++) {
    if (amount+1 == GM_getValue("common_count", 5)) {
        countSelect += "<option value='"+(amount+1)+"' selected>"+(amount+1)+"</option>";
    } else {
        countSelect += "<option value='"+(amount+1)+"'>"+(amount+1)+"</option>";
    }
}
countSelect += "</select>  (Number of common accounts to find)<br/><br/>";
optionsPage.append(countSelect);
optionsPage.append("<p>Script brought to you by bizkut in collaboration with OmicroN.</p><p>If you have any suggestions for more features or bugs, "
                   +"send a message to bizkut on <a href='https://www.reddit.com/message/compose/?to=bizkut'>reddit</a> or OmicroN on <a href='https://www.reddit.com/message/compose/?to=-OmicroN-'>reddit</a>.</p>");

function prepToggle(id, gm_val) {
    if(GM_getValue(gm_val)===true){
        $(id).prop('checked', true);
    }
    $(id).on('change', function() {
        if($(this).is(":checked")) {
            GM_setValue(gm_val, true)
        } else {
            GM_setValue(gm_val, false)
        }
    });
}
optionsLink.on('click',function() {
    $("#filters").remove();
    var contentSection = $("#content").addClass('noFilters pad');
    contentSection.empty();
    contentSection.append(optionsPage);
    prepToggle("#longTime", "longTime");
    prepToggle("#dinkProtect", "dink_protect");
    prepToggle("#communityAlert", "alert_community");
    prepToggle("#reportCounter", "report_counter");
    $("#commonCount").on('change', function() {
        GM_setValue("common_count", $(this).val());
    });
});

var supportLink = $('<a href="#" id="support">Support</a>');

optionsLink.after(supportLink);
supportLink.on('click', displaySupport);
function displaySupport() {
    $("#filters").remove();
    var contentSection = $("#content").addClass('noFilters pad');
    contentSection.empty();
    contentSection.append(buildSupport());
}

function buildSupport() {
    var supportPage = $("<div id='supportPage'/>");
    var knownTickets = JSON.parse(GM_getValue('known_tickets',"{}"));

    var waitingCount = 0;
    var ticket = null;
    var style = "";
    for (key in knownTickets) {
        ticket = knownTickets[key];
        var ticketRow = $("<div id='" + ticket.ticket.id + "'/>");
        if (ticket.waiting) {
            style=" style='color:red' ";
            waitingCount++;
        } else {
            style = "";
        }
        ticketRow.html('<a href="http://support.koalabeast.com/#/ticket/'+ ticket.ticket.id
                       +'" '+ style + 'target="_blank">Appeal ' + ticket.ticket.id + ' (Banned by '
                       + (ticket.ticket.bannedBy == GM_getValue('mod_username')? "you":ticket.ticket.bannedBy) + ') - '+ ticket.ticket.comments.length
                       + ' comment'+(ticket.ticket.comments.length!=1?'s':'')+'</a><br/>');
        supportPage.append(ticketRow);
    }

    var title = $("a#support");
    if (waitingCount > 0) {
        title.text('('+waitingCount+') Support');
    } else {
        title.text('Support');
    }

    if ($("#supportPage").length > 0) {
        var contentSection = $("#content");
        contentSection.empty();
        contentSection.append(buildSupport());
    }

    return supportPage;
}

function setMod() {
    if (GM_getValue('mod_username') === undefined) {
        $.get(window.location.origin, function (data) {
            var hrf = $(data).find("a:contains('Profile')")[0].href;
            $.get(hrf, function (data2) {
                GM_setValue('mod_username', $(data2).find("#reservedName").val());
            });
        });
    }
}
setMod();

/*
 * For some reason, crosstab.util.tabs is coming up as empty sometimes, so wrap this.
 * It means we don't get the API calls sometimes though.
 */
function isMasterTab() {
    return  crosstab.util.tabs[crosstab.util.keys.MASTER_TAB] ?
        crosstab.util.tabs[crosstab.util.keys.MASTER_TAB].id === crosstab.id
    :false;
}

// Check every second, only poll every 5 though.  Tab could become active partway through.
//setInterval(checkTickets, 1000);
function checkTickets() {
    if (GM_getValue('mod_username') !== undefined) {
        if ((GM_getValue('last_ticket_check') === undefined
             || GM_getValue('last_ticket_check') < ((new Date().getTime() / 1000)) - 5)
            && isMasterTab()) {

            GM_xmlhttpRequest({
                method: "GET",
                headers: {"Accept": "application/json"},
                url: "http://support.koalabeast.com/tickets/open",
                onload: function(response) {
                    var knownTickets = JSON.parse(GM_getValue('known_tickets',"{}"));

                    GM_setValue('last_ticket_check', (new Date().getTime() / 1000));
                    try {
                        var warn = $('#support-warning');
                        if (warn.length > 0) {
                            warn.remove();
                        }
                        knownTickets = JSON.parse(response.responseText);
                    } catch (err) {
                        var warned = $('#support-warning').length > 0;
                        if (!warned) {
                            $('header > a').append('<a href="http://support.koalabeast.com/#/login" id="support-warning" target="_blank" style="font-weight:bold;color:red;padding-left:40%;">(You are not logged into the support site)</a>');
                            console.log('Error happened');
                            console.dir(err);
                        }
                        return;
                    }
                    knownTickets.forEach(function(ticket, index, array) {
                        if (appealMatches(ticket.bannedBy)) {
                            var waiting = ticket.comments.length > 0 ?
                                ticket.comments[ticket.comments.length - 1].author == "ticket creator"
                            : true;

                            // Notify if waiting
                            if (waiting) {
                                if (knownTickets[ticket.id]) {
                                    if (!knownTickets[ticket.id].waiting) {
                                        // Refresh it, we got it
                                        attemptNotify(ticket);
                                    }
                                } else {
                                    // Refresh it, we got it
                                    attemptNotify(ticket);
                                }
                            }

                            knownTickets[ticket.id] = {
                                ticket: ticket,
                                waiting: waiting,
                                live: true
                            };
                        }
                    });

                    // Clean up tickets that could have been removed
                    for (key in knownTickets) {
                        if (knownTickets[key].live) {
                            knownTickets[key].live = false;
                        } else {
                            delete knownTickets[key];
                        }
                    }
                    GM_setValue('known_tickets', JSON.stringify(knownTickets));
                }
            });
        }
    }
}


function attemptNotify(ticket) {
    if (!("Notification" in window)) {
        return;
    }
    else if (Notification.permission === "granted") {
        notifyOfAppeal(ticket);
    }
    else if (Notification.permission !== 'denied') {
        Notification.requestPermission(function (permission) {
            if (permission === "granted") {
                notifyOfAppeal(ticket);
            }
        });
    }
}

function notifyOfAppeal(ticket) {

    var notification = new Notification("Active Appeal", {
        'body': 'You have an appeal waiting for a moderator response!',
        'icon': 'http://static.koalabeast.com/images/favicon.ico'
    });

    notification.onclick = function() {
        window.open('http://support.koalabeast.com/#/ticket/' + ticket.id, '_blank');
        notification.close();
    }
}

function appealMatches(appealName) {
    return (appealName.toUpperCase() == GM_getValue('mod_username').toUpperCase()) ||
        (GM_getValue('alert_community') && appealName.toUpperCase() == 'COMMUNITY');
}

GM_addValueChangeListener('known_tickets', buildSupport);

function bindReason(e) {
    var t = moderate.kickReasons["" + e];
    return t ? t.text : ""
}
function bindPlayerName(e) {
    return e ? e.reservedName : ""
}

function bindSince(e) {
    return e ? moment(e).format("MMMM D YYYY h:mm:ss A") : "-"
}

function bindDate(e) {
    return moment(e).format("LLL")
}

function bindChatTo(e) {
    switch (e) {
        case 1:
            return "All";
        case 2:
            return "Team";
        case 3:
            return "Mod";
        default:
            return ""
    }
}

function bindUserId(e) {
    return e ? e : ""
}

function bindGameState(e) {
    switch (e) {
        case 1:
            return "In Progress";
        case 2:
            return "Completed";
        case 3:
            return "Starting";
        default:
            return "I Dunno"
    }
}

function bindBool(e) {
    return e ? "Yes" : "No"
}

function bindValue(e) {
    return e ? e : ""
}

function dinkProtect(override = false) {
    if (override === true || GM_getValue("dink_protect") === true) {
        if (confirm("Are you sure you want to do that, you dink?")) {
            if (confirm("Like, absolutely sure?")) {
                return true;
            }
        }
        return false;
    } else {
        return true;
    }
}

function isMuteActive(text) {
    return text.indexOf("in") >= 0;
}

var newAcntHours = 48;
function colorAccountInfo(accountLink, extraInfo = true) {
    $.get(accountLink[0].href, function (data) {
        var children = $(data).children("form").children();
        var reserved = $(children[0]).find("span").text();
        var display = $(children[1]).find("span").text();
        accountLink.attr("data-name", reserved?reserved:display);
        var hoursAgo = ($(children[2]).children("span").text());
        var lastIp = ($(children[3]).children("a").text());
        var accountAge = ($(children[4]).children("span").text());
        var muteCount = ($(children[9]).children("span").text()); // this gives us some text with the number in parentheses
        var banCount = $(data).find("#banCount").val();
        if (extraInfo) {
            accountLink.append(" - Last Played: " + hoursAgo + " | IP: " + lastIp + " | Age: " + accountAge);
        }

        accountLink.append(" | Bans: " + banCount + " | Mutes: " + muteCount);
        if (muteCount.length) {
            muteCount = muteCount.match(/\(([^)]+)\)/)[1]; // Pull that number out
            accountLink.append(" | Mutes: " + muteCount);
        }
        var hours = hoursAgo.split(" ")[0];
        var hoursAsFloat = parseFloat(hours);
        var hoursAge = accountAge.split(" ")[0];
        var hoursAgeAsFloat = parseFloat(hoursAge);
        var muteText = $(children[9]).find("span").text();

        accountLink.attr('data-bancount', banCount);

        // Orange/Cyan added for new accounts by Ballzilla
        if (data.indexOf("unbanButton") > -1) {
            accountLink.append(" (This user is currently banned)");
            if(hoursAgeAsFloat <= newAcntHours) {
                accountLink.css({
                    'color': 'orange'
                })
            } else {
                accountLink.css({
                    'color': 'red'
                })
            }
        } else if (isMuteActive(muteText)) {
            accountLink.css({
                'color': 'yellow'
            })
        } else if(hoursAgeAsFloat <= newAcntHours) {
            accountLink.css({
                'color': 'cyan'
            });
        }
        else if (hoursAsFloat <= 1) {
            accountLink.css({
                'color': 'green'
            });
        }
    });
}
if (window.location.pathname.indexOf("fingerprints") > -1) {
    $("div a").each(function (index, domObject) {
        var obj = $(domObject);
        colorAccountInfo(obj);
    });
}
if (window.location.pathname.indexOf("reports") > -1) {
    $("#filters").append("<div style='margin: 0'><input type='checkbox' id='toggleSys' /><label for='toggleSys'>Hide system reports</label></div>");
    if(GM_getValue("hideSystem")===true){
        $("#toggleSys").prop('checked', true);
    }
    $("#toggleSys").on('change', function() {
        if($(this).is(":checked")) {
            GM_setValue("hideSystem", true)
        } else {
            GM_setValue("hideSystem", false)
        }
    });

    moderate.smartBind = function smartBind($template, data) {
        var games = {};
        function bind($template, obj) {
            var $result = $template.clone();
            return $result.find("[data-bind]").each(function() {
                var property = $(this).attr("data-bind"),
                    format = $(this).attr("data-format"),
                    filterProperty = $(this).attr("data-filter-bind"),
                    value = null;
                eval("value = obj." + property);
                if(property === "gameId") {
                    games[value] = games[value]? games[value]+1 : 1;
                }
                if (filterProperty) {
                    var filterValue = null;
                    value && eval("filterValue = value." + filterProperty), $(this).attr("data-filter-value", filterValue)
                }
                if (format) {
                    var func = null;
                    eval("func = " + format), value = func(value)
                }
                if (GM_getValue("hideSystem")===true) {
                    if (property == "byIP" && value == null) {
                        $(this.parentNode.parentNode).css("display", "none")
                        return;
                    }
                }
                $(this).text(value)
            }), $result.find("button[data-link]").each(function() {
                var e = "chat?",
                    t = $(this),
                    n = t.parents("tr:first"),
                    r = $(this).attr("data-params").split(" ").map(function(e) {
                        var t = n.find("[data-bind=" + e + "]"),
                            r = t.attr("data-filter-value") ? t.attr("data-filter-value") : t.text();
                        return e + "=" + r
                    }).join("&");
                t.attr("data-link", e + r)
            }), $result.find("a[data-link]").each(function() {
                var e = "chat?",
                    t = $(this),
                    n = t.parents("tr:first"),
                    r = $(this).attr("data-params").split(" ").map(function(e) {
                        var t = n.find("[data-bind=" + e + "]"),
                            r = t.attr("data-filter-value") ? t.attr("data-filter-value") : t.text();
                        return e + "=" + r
                    }).join("&");
                t.attr("href", e + r)
            }), $result.find("[data-if]").each(function() {
                var property = $(this).attr("data-if"),
                    value = null;
                try {
                    eval("value = obj." + property)
                } catch (e) {}
                if (!value) return $(this).remove();
                $(this).attr("href", $(this).attr("href").replace(/{value}/g, value))
            }), $result.find("[data-strike-if]").each(function() {
                var property = $(this).attr("data-strike-if"),
                    value = null;
                try {
                    eval("value = obj." + property)
                } catch (e) {}
                if (value) return $(this).css("text-decoration", "line-through")
                    }), $result
        }

        var rows = Array.isArray(data) ? data.map(function(e) {
            return bind($template, e)
        }) : bind($template, data);
        rows.forEach(function(element) {
            var text = $(element).children()[6].innerText;
            if(games[text] > 2) {
                $($(element).children()[6]).prepend("("+games[text]+") ").css({'color':'red'});
            }
        });
        return rows;
    };
}

if(window.location.pathname.indexOf('chat') > -1) {
    moderate.smartBind = function smartBind($template, data) {
        function bind($template, obj) {
            var $result = $template.clone();
            return $result.find("[data-bind]").each(function() {
                var property = $(this).attr("data-bind"),
                    format = $(this).attr("data-format"),
                    filterProperty = $(this).attr("data-filter-bind"),
                    value = null;
                eval("value = obj." + property);
                if (filterProperty) {
                    var filterValue = null;
                    value && eval("filterValue = value." + filterProperty), $(this).attr("data-filter-value", filterValue)
                }
                if (format) {
                    var func = null;
                    eval("func = " + format), value = func(value)
                }
                $(this).text(value)
            }), $result.find("button[data-link]").each(function() {
                var e = "chat?",
                    t = $(this),
                    n = t.parents("tr:first"),
                    r = $(this).attr("data-params").split(" ").map(function(e) {
                        var t = n.find("[data-bind=" + e + "]"),
                            r = t.attr("data-filter-value") ? t.attr("data-filter-value") : t.text();
                        return e + "=" + r
                    }).join("&");
                t.attr("data-link", e + r)
            }), $result.find("a[data-link]").each(function() {
                var e = "chat?",
                    t = $(this),
                    n = t.parents("tr:first"),
                    r = $(this).attr("data-params").split(" ").map(function(e) {
                        var t = n.find("[data-bind=" + e + "]"),
                            r = t.attr("data-filter-value") ? t.attr("data-filter-value") : t.text();
                        return e + "=" + r
                    }).join("&");
                t.attr("href", e + r)
            }), $result.find("[data-if]").each(function() {
                var property = $(this).attr("data-if"),
                    value = null;
                try {
                    eval("value = obj." + property)
                } catch (e) {}
                if (!value) return $(this).remove();
                $(this).attr("href", $(this).attr("href").replace(/{value}/g, value))
            }), $result.find("[data-strike-if]").each(function() {
                var property = $(this).attr("data-strike-if"),
                    value = null;
                try {
                    eval("value = obj." + property)
                } catch (e) {}
                if (value) return $(this).css("text-decoration", "line-through")
                    }), $result
        }
        return Array.isArray(data) ? data.map(function(e) {
            return bind($template, e)
        }) : bind($template, data)
    };
    function bindDate(e) {
        if (GM_getValue('longTime') === true) {
            return moment(e).format("MMMM D YYYY h:mm:ss A");
        } else {
            return moment(e).format("LLL");
        }
    }
    $('#reportRows').on('click', 'th', function() {
        var $this = $(this);
        if ($this.parent().children()[6] != this) { return; }

        if ($this.data('selected')) {
            $this.removeData('selected');
        } else {
            $this.data('selected', true);
        }
        $this.css('background-color', $this.data('selected')?'#444':'');
    });

    $('#report .buttons').append($('<button id="copyToClipboard" class="small">Get Selected Text</button>').click(function() {
        var copyStr = "";
        $('#reportRows tr').find('th:eq(6)').each(function(idx, el) {
            var $el = $(el);
            if ($el.data('selected')) {
                copyStr = $el.prev().text()+ ": " + $el.text() + "   \n" + copyStr;
            }
        });
        copyStr = ">"+copyStr;

        $('.copybox').remove();
        var $text = $('<textarea class="copybox" style="height:1.2em;vertical-align:bottom"></textarea>').text(copyStr);
        $('#report .buttons').append($text);
        $text.select();
    }));
}

if(window.location.pathname.indexOf('users') > -1 || window.location.pathname.indexOf('ips') > -1) {
    $("#shadowmuteButton").hide();
    setActiveCountOnRecentReports(!GM_getValue('report_counter')); //note the !, enabling the checkbox disables functionality
    evasionSection();
    var profId = window.location.pathname.substr(window.location.pathname.lastIndexOf('/') + 1);
    var section = window.location.pathname.indexOf('users') > -1 ? 'users' : 'ips';
    if(window.location.pathname.indexOf('users') > -1) {
        var fingerprints = $('a[href*="fingerprints"]').parent();
        var par = fingerprints.parent();
        var togglePrints = $("<span id='togglePrints'>[-] Collapse</span>");
        if(GM_getValue("hideFingerprints")===true) {
            togglePrints = $("<span id='togglePrints'>[+] Expand</span>");
            fingerprints.hide();
        }
        togglePrints.on('click', function(e) {
            if(fingerprints.is(':visible')) {
                fingerprints.hide();
                GM_setValue("hideFingerprints", true);
                togglePrints.text('[+] Expand');
            } else {
                fingerprints.show();
                GM_setValue("hideFingerprints", false);
                togglePrints.text('[-] Collapse');
            }
        })
        $(par.children()[0]).after(togglePrints);

        var names = [];
        var fingerQueue = [];
        var fingerprintList = [];
        var totalFingerprints = 0;

        $('#togglePrints').next('div').find('a').each(function() {
            fingerprintList.push($(this).html());
        });

        totalFingerprints = fingerprintList.length;

        if (fingerprintList.length > 0) {
            var calculate = $("<button id='calcFingerprints' class='tiny'>Find Common Accounts (May take some time)</button>");
            var sharedAccountDiv = $("<div id='sharedAccounts'/>");
            sharedAccountDiv.append(calculate);
            fingerprints.parent().after(sharedAccountDiv);
            calculate.on('click', function(e) {
                e.preventDefault();
                for (i = 0; i < (fingerprintList.length < 10 ? fingerprintList.length : 10); i++)
                {
                    fingerQueue[i] = setTimeout(function(i) { setTimeout(checkfingerprint(i), 0) }, 0, i);
                }
            });
            function sortObject(obj) {
                var arr = [];
                for (var prop in obj) {
                    if (obj.hasOwnProperty(prop)) {
                        arr.push({
                            'key': prop,
                            'value': obj[prop]
                        });
                    }
                }
                arr.sort(function(a, b) { return b.value.count - a.value.count; });
                return arr;
            }

            function checkfingerprint(pos) {
                var queueId = fingerQueue[pos];

                $("#calcFingerprints").prop('disabled', true).css('backgroundColor', '#F4F4F4').html('Checking ' + (totalFingerprints - fingerprintList.length + 1) + ' of ' + totalFingerprints + ' fingerprints...');

                var fingerprint = fingerprintList.splice(0, 1);

                $.ajax({url: window.location.origin + '/moderate/fingerprints/' + fingerprint}).done(function(data) {
                    $(data).find('div > a').each(function() {
                        var link = '' + $(this).attr('href');
                        if (typeof names[link] == 'undefined') {
                            names[link] = {
                                count : 1,
                                name : $(this).html()
                            };
                        } else {
                            names[link].count += 1;
                        }
                    });
                }).always(function() {
                    if (fingerprintList.length == 0) {
                        for (i = 0; i < fingerQueue.length; i++) {
                            if (fingerQueue[i] == queueId) {
                                fingerQueue.splice(i, 1);
                            }
                        }

                        if (fingerQueue.length == 0) {
                            $("#calcFingerprints").remove();

                            arr = sortObject(names);
                            arr = arr.splice(0, GM_getValue("common_count",5));
                            var occurrances = $('<div>Top ' + GM_getValue("common_count",5) + ' Name Occurrances in ' + totalFingerprints + ' Fingerprints:</div>');
                            occurrances.append("<br/>");


                            $.each(arr, function(key, value) {
                                var link = $("<a href = '" + arr[key].key + "'>" + arr[key].value.name + " - <strong>Appears " + arr[key].value.count + " times</strong></a>");
                                colorAccountInfo(link);
                                occurrances.append(link).append("<br/>");
                            });

                            $("#sharedAccounts").append(occurrances);
                        }
                    } else {
                        checkfingerprint(pos);
                    }
                });
            }
        }
    }
    var selectCopy = $("#banSelect").clone();
    selectCopy.attr('id', "banCopy");
    var prevChild = $("#banSelect").prev();
    $("#banSelect").remove();
    prevChild.after(selectCopy);

    $("#unbanButton").remove();
    var unban = $("<button id='unbanButton' class='tiny'>Unban</button>");
    if ($("#muteButton").length) {
       prevChild.parent().prev().prev().prev().append(unban);
    }
    else{
        prevChild.parent().prev().append(unban);
    }

    var currentBanCount = $("#banCount").val();
    var select = $("<select id = 'removeCount'/>");
    var error = null;
    for(var i=1; i<= currentBanCount;i++) {
        $("<option />", {value: i, text: i}).appendTo(select);
    }
    select.appendTo(unban.prev());
    $("#unbanButton").off('click');
    unbanClicked = false;
    $("#unbanButton").on('click.bizkut',function(e) {
        e.preventDefault();
        if (!dinkProtect()) {
            return;
        }
        var removeBans = $("#removeCount").val();
        if(unbanClicked === false) {
            unbanCallback();
        } else {
            alert("You already clicked unban once u dink");
        }

        function unbanCallback() {
            unbanClicked = true;
            if(removeBans > 0) {
                removeBans--;
                $.post(document.location.href + "/unban", {}, function(e) {
                    if (!e) return;
                    if(e.alert) {
                        alert(e.alert);
                        error = true;
                    }
                    if(!error) {
                        unbanCallback();
                    }
                });
            } else {
                location.reload();
            }
        }
    });

    var banAmount = $("<select id='banAmount' />");
    for(var x = 1;x<=10;x++) {
        $("<option />", {value: x, text: x}).appendTo(banAmount);
    }

    prevChild.parent().append(banAmount);

    var submitBan = $("<button id='submitBan' class='tiny'>BAN EM</button>");
    var banClicked = false;
    submitBan.on('click', function(e) {
        e.preventDefault();
        if (!dinkProtect()) {
            return;
        }
        var banReason = $("#banCopy").val();


        var start = parseInt($("#banCount").val());
        var finish = start + parseInt($("#banAmount").val());


        if(banClicked === false){
            banCallback();
        } else {
            alert("You already clicked ban once u dink");
        }

        function banCallback() {
            banClicked = true;
            if(start < finish) {
                start++;
                banAction(profId, section, start, banReason, banCallback);
            } else {
                location.reload();
            }
        }
    });
    prevChild.parent().append(submitBan);

    function getIPInfo(ip) {
        GM_xmlhttpRequest({
            method: "GET",
            headers: {
                "Accept": "application/json",
                "X-key": "NTQ2ODo1cFZHbXNwRlg2b3dseXFxVnBmbWhsSTgzZGZrUUxvYQ=="
            },
            url: "http://v2.api.iphub.info/ip/"+ip,
            onload: function(response) {
                var json = JSON.parse(response.responseText),
                    type, color;
                if (json.block == 0) {
                    type = 'Residential or business';
                    color = '#04bd04'; // green
                } else if (json.block == 1) {
                    type = 'Non-residential IP';
                    color = '#e74c3c'; // red
                } else if (json.block == 2) {
                    type = 'Non-residential & residential IP';
                    color = '#f39c12'; // orange
                }

                var ipInfo = $("<div style='padding-left:20px'></div>");
                ipInfo.append("<div style='max-width:300px'><span>Country</span><span style='float:right'>"+json.countryName+"</span></div>");
                ipInfo.append("<div style='max-width:300px'><span>ISP</span><span style='float:right'>"+json.isp+"</span></div>");
                ipInfo.append("<div style='max-width:300px'><span>Type</span><span style='float:right; color:"+color+"'>"+type+"</span></div>");
                $('#ipCheck').parent().append(ipInfo);
            }
        });
    }

    var ipCheck = $("<button id='ipCheck' class='tiny'>VPN Check</button>");
    ipCheck.on('click', function(e) {
        e.preventDefault();
        var el = $(this);
        el.hide();
        getIPInfo(el.prev().text());
    });
    $('label:contains("'+ (section == 'users' ? 'Last IP' : 'IP Address') +'")').parent().append(ipCheck);

    if(profId !== 'users') {
        $("<h2 id='comment_title'>Comments</h2>").appendTo("#content");

        $.get(commentAPI + "comment/"+profId, function (data) {
            $(data).insertAfter("#comment_title");

            $("<textarea id='comment_box' />").insertAfter($('#comments'));

            var makeComment = $("<button id='submitComment' class='tiny'>Submit</button>");
            var cancelComment = $("<button id='cancelComment' class='tiny'>Cancel</button>")
            var commented = false;
            makeComment.on('click', function() {
                var text = $("#comment_box").val();
                if($.trim(text).length !== 0) {
                    if(commented === false) {
                        commented = true;
                        if (GM_getValue('mod_username') !== undefined) {
                            $.post( commentAPI + "comment", { profile: profId, comment: text, modName: GM_getValue('mod_username') })
                                .done(function( data ) {
                                location.reload();
                            });
                        } else {
                            alert("Hmm, I can't find your username to post with :(");
                        }
                    } else {
                        alert("You already clicked comment once u dink");
                    }
                }
            });
            cancelComment.on('click', function() {
                $("#comment_box").val("");
            });

            makeComment.insertAfter($("#comment_box"));
            cancelComment.insertAfter(makeComment);
            $("<br/>").insertBefore(makeComment);
        });
    }
}

function setActiveCountOnRecentReports(optionEnabled) {
    var reportsJSONObj;
    reports = document.querySelectorAll('[title="Remove report"]');
    reportCount = reports.length;
    if(optionEnabled && reportCount>0) {
        getReportReasons(loopThroughReports);
    }
}

function getReportReasons(callback) {
    $.getJSON(document.location.origin+"/misc/kickReasons.json", function (data) {
        reportsJSONObj = data;
        callback();
    });
}

function loopThroughReports() {
    activeReportCounter = 0;
    for (var i=0; i<reportCount; i++) {
        reportReasonRaw = reports[i].parentNode.children[0].innerText;
        reportReason = reportReasonRaw.substr(0, reportReasonRaw.indexOf(" by ")); //remove reporter name
        activeReportCounter += doesReportIncrementCount(reportReason);
    }
    updateRecentReportsHeader(activeReportCounter);
}

function doesReportIncrementCount(reason) {
    for (var i=1; i<=Object.keys(reportsJSONObj).length; i++) {
        line = reportsJSONObj[i];
        if(reason == line.text && line.incrementReportCount) {
            return 1;
        }
    }
    return 0;
}

function updateRecentReportsHeader(activeReportCounter) {
    h2Elements = document.getElementsByTagName("h2");
    for(var i=0; i<h2Elements.length; i++) { //I don't know how to find the right one without looping through
        if(h2Elements[i].innerText.indexOf("Recent Reports (") >= 0) {
            h2Elements[i].innerText = "Recent Reports (24 hours) - " + activeReportCounter + " active";
            tooltipText = "Reports that do not count towards the active total:";
            for(var j=1; j<Object.keys(reportsJSONObj).length; j++) {
                if(!reportsJSONObj[j].incrementReportCount) {
                    tooltipText += "\n- " + reportsJSONObj[j].text;
                }
            }
            h2Elements[i].title = tooltipText;
        }
    }
}

// inject custom style for highlighting of ips
$('head').append('<style> .highlight { text-decoration: underline !important; color: red !important; } </style>');

// custom jquery function to search elements and highlight parts of the ip matching high risk ips
jQuery.fn.highlightRisk = function() {
    var node = this[0], bestMatch = null, bestLength = null;

    // for each ip found on the page we need to check against every high risk ip and identifier the ip that matches best
    $.each(highRiskIPs, function(index, ip) {
        ip = ip.split('.');

        var regex = new RegExp('\\b' + ip[0] + '\\.' + ip[1] + '(?=\\.\\d+\\.\\d+)(\\.' + ip[2] + '(?=\\.\\d+)(\.' + ip[3] + ')?)?', 'i');
        var match = regex.exec(node.data);

        if (match != null) {
            if (bestMatch == null) {
                bestMatch = regex;
                bestLength = match[0].length;
            } else {
                if (bestLength < match[0].length) {
                    bestMatch = regex;
                    bestLength = match[0].length;
                }
            }
        }
    });

    // use the best matching high risk ip and highlight the matching sections of the ip being checked
    if (bestMatch != null) {
        var pos = node.data.search(bestMatch);
        var match = node.data.match(bestMatch);
        var spanNode = document.createElement('span');

        // since our highlighting is wrapped in a span we must add ipchecked to it so it doesn't get picked up as an unchecked element next interval
        spanNode.className = 'highlight ipchecked';

        var middleBit = node.splitText(pos);
        var endBit = middleBit.splitText(match[0].length);
        var middleClone = middleBit.cloneNode(true);

        spanNode.appendChild(middleClone);
        middleBit.parentNode.replaceChild(spanNode, middleBit);
    }
};

// Grab the list of High Risk IPs
$.get(evasionAPI + 'evaders', function(response) {
    highRiskIPs = JSON.parse(response);

    // 1 second interval to check for new ips to match against
    setInterval(function() {
        $('a, span').not('.ipchecked').contents().each(function() {
            // set this element as checked so its not checked again; we must use parent because .contents() pulls the text node (nodeType 3) not the element that contains the text
            $(this).parent().addClass('ipchecked');

            if ($(this)[0].nodeType == 3 && $(this)[0].length > 0 && /\d+\.\d+\.\d+\.\d+/.test($(this)[0].nodeValue)) {
                setTimeout(function(ele) {
                    $(ele).highlightRisk();
                }, 0, this);
            }
        });
    }, 1000);
});

var sortUserLastGame = function(ascOrDesc) {
    var userRows = $('tr');
    dashUsers = [];

    $('#reportRows').html('');
    recursiveLastPlayedSort(userRows, ascOrDesc);

    if (ascOrDesc === 'desc') {
        return 'asc';
    } else {
        return 'desc';
    }
}

var recursiveLastPlayedSort = function(userRows, ascOrDesc) {
    var currentLow = null;
    var currentLowHoursPlayed = null;
    var currentLowIndex = null;

    //  Only run it if we have rows to look at
    if (userRows.length > 0) {
        //  Find the current lowest number of hours played
        for (var i = 0; i < userRows.length; i++) {
            //  If it's a dash user we'll put them at the end
            if (userRows.eq(i).find('th:nth-child(4)').text() !== '-') {
                var hoursPlayed = userRows.eq(i).find('th:nth-child(4)').text().match(/\d+/g);

                if (hoursPlayed !== null && (parseInt(hoursPlayed, 10) < currentLowHoursPlayed || currentLow === null)) {
                    currentLowHoursPlayed = parseInt(hoursPlayed, 10);
                    currentLow = userRows.eq(i);
                    currentLowIndex = i;
                }
            } else {
                dashUsers.push(userRows.eq(i));
            }
        }

        //  Append the lowest row and splice the element out of the array
        if (currentLow !== undefined) {
            if (ascOrDesc === 'desc') {
                $('#reportRows').append(currentLow);
            } else {
                $('#reportRows').prepend(currentLow);
            }
            
            userRows.splice(currentLowIndex, 1);
        }

        recursiveLastPlayedSort(userRows, ascOrDesc);
    } else {
        //  Put the dash users we found at the end
        dashUsers.forEach(function(row) {
            if (ascOrDesc === 'desc') {
                $('#reportRows').append(row);
            } else {
                $('#reportRows').prepend(row);
            }
        });

        return;
    }
}

if (window.location.pathname.indexOf("users") > -1) {
    var ascOrDesc = 'desc';
    var dashUsers = [];

    $('th').click(function(e) {
        if ($(this).text() === 'Last Game') {
            ascOrDesc = sortUserLastGame(ascOrDesc);
        }
    });
}
