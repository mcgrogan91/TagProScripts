// ==UserScript==
// @name         Mod Tools Helper
// @namespace    http://www.reddit.com/u/bizkut
// @updateURL    https://github.com/mcgrogan91/TagProScripts/raw/master/modtools.user.js
// @version      1.2.2
// @description  It does a lot.  And then some.  I'm not even joking.  It does too much.
// @author       Bizkut
// @include      http://tagpro-*.koalabeast.com/moderate/*
// @include      http://tangent.jukejuice.com/moderate/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/crosstab/0.2.12/crosstab.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addValueChangeListener
// ==/UserScript==

if (("Notification" in window)) {
    if (Notification.permission !== "granted" && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

var optionsLink = $('<a href="#" id="options">Options</a>');
var optionsPage = $("<div style='padding:20px'/>");
$("a[href='/moderate/modactions']").after(optionsLink);
optionsPage.append("SETTINGS!<br/><br/>");
optionsPage.append("<input type='checkbox' id='longTime'>Full time on Chat Page</input> (Adds seconds to times)<br/><br/>");
optionsPage.append("<input type='checkbox' id='dinkProtect'>Enable dink protections</input> (Requires verification to ban/unban)<br/><br/>");

optionsPage.append("<input type='checkbox' id='communityAlert'>Community Alerts</input> (Triggers notifications on Community Ban Appeals)<br/><br/>");
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
optionsPage.append("<p>Script brought to you by bizkut.  If you have any suggestions for more features, "
                    +"send a message to me on <a href='https://www.reddit.com/message/compose/?to=bizkut'>reddit!</a></p>");

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
    var contentSection = $("#content");
    contentSection.empty();
    contentSection.append(optionsPage);
    prepToggle("#longTime", "longTime");
    prepToggle("#dinkProtect", "dink_protect");
    prepToggle("#communityAlert", "alert_community");
    $("#commonCount").on('change', function() {
        GM_setValue("common_count", $(this).val());
    });
});

var supportLink = $('<a href="#" id="support">Support</a>');

optionsLink.after(supportLink);
supportLink.on('click', displaySupport);
function displaySupport() {
    $("#filters").remove();
    var contentSection = $("#content");
    contentSection.empty();
    contentSection.append(buildSupport());
}

function buildSupport() {
    var supportPage = $("<div id='supportPage' style='padding:20px'/>");
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

function isMasterTab() {
    return crosstab.util.tabs[crosstab.util.keys.MASTER_TAB].id === crosstab.id;
}

// Check every second, only poll every 5 though.  Tab could become active partway through.
setInterval(checkTickets, 1000);
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
                    var tickets = JSON.parse(response.responseText);
                    tickets.forEach(function(ticket, index, array) {
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

function dinkProtect() {
    if (GM_getValue("dink_protect") === true) {
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

var newAcntHours = 48;
function colorAccountInfo(accountLink) {
    $.get(accountLink[0].href, function (data) {
        var children = $(data).children("form").children();
        var hoursAgo = ($(children[2]).children("span").text());
        var lastIp = ($(children[3]).children("a").text());
        var accountAge = ($(children[4]).children("span").text());
        accountLink.append(" - Last Played: " + hoursAgo + " | IP: " + lastIp + " | Age: " + accountAge)
        var hours = hoursAgo.split(" ")[0];
        var hoursAsFloat = parseFloat(hours);
        var hoursAge = accountAge.split(" ")[0];
        var hoursAgeAsFloat = parseFloat(hoursAge);

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
    $("#filters").append("<input type='checkbox' id='toggleSys'>Hide system reports</input>");
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
        var fingerprintList = [];

        $('#togglePrints').next('div').find('a').each(function() {
            fingerprintList.push($(this).html());
        });

        if (fingerprintList.length > 0) {
            var calculate = $("<button id='calcFingerprints' class='tiny'>Find Common Accounts (May take some time)</button>");
            var sharedAccountDiv = $("<div id='sharedAccounts'/>");
            sharedAccountDiv.append(calculate);
            fingerprints.parent().after(sharedAccountDiv);
            calculate.on('click', function(e) {
                e.preventDefault();
                checkfingerprint();
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

            function checkfingerprint() {
                $("#calcFingerprints").remove();
                $.get(window.location.origin + '/moderate/fingerprints/' + fingerprintList[0], function(data) {
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
                }).done(function() {
                    fingerprintList.splice(0, 1);

                    if (fingerprintList.length == 0) {
                        arr = sortObject(names);
                        arr = arr.splice(0, GM_getValue("common_count",5));
                        var occurrances = $('<div>Top ' + GM_getValue("common_count",5) + ' Name Occurrances in Fingerprints:</div>');
                        occurrances.append("<br/>");


                        $.each(arr, function(key, value) {
                            var link = $("<a href = '" + arr[key].key + "'>" + arr[key].value.name + "</a>");
                            colorAccountInfo(link);
                            occurrances.append(link).append("<br/>");
                        });

                        $("#sharedAccounts").append(occurrances);
                    } else {
                        checkfingerprint();
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
    prevChild.parent().prev().append(unban);

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
                console.log('banning');
                $.post(document.location.href + "/ban", {
                    reason: banReason,
                    banCount: start
                }, banCallback);
            } else {
                location.reload();
            }
        }
    });
    prevChild.parent().append(submitBan);

    var profId = window.location.pathname.substr(window.location.pathname.lastIndexOf('/') + 1);
    if(profId !== 'users') {
        $("<h2 id='comment_title'>Comments</h2>").appendTo("#content");

        $.get("http://104.236.225.6/comment/"+profId, function (data) {
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
                            $.post( "http://104.236.225.6/comment", { profile: profId, comment: text, modName: GM_getValue('mod_username') })
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
