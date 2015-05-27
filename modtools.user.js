// ==UserScript==
// @name         Mod Tools Helper
// @namespace    http://www.reddit.com/u/bizkut
// @version      1.1.1
// @description  It does a lot.
// @author       Bizkut
// @include      http://tagpro-*.koalabeast.com/moderate/*
// @include      http://tangent.jukejuice.com/moderate/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.js
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==
if (window.location.pathname.indexOf("fingerprints") > -1) {
    $("div a").each(function (index, domObject) {
        var obj = $(domObject);
        $.get(obj[0].href, function (data) {
            var hoursago = ($($(data).children("form").children()[2]).children("span").text());
            var lastIp = ($($(data).children("form").children()[3]).children("a").text());
            obj.append(" - Last Played: " + hoursago + " | IP: " + lastIp)
            var hours = hoursago.split(" ")[0];
            var hoursAsFloat = parseFloat(hours);
            if (hoursAsFloat <= 1) {
                obj.css({
                    'color': 'green'
                });
            }
            if (data.indexOf("unbanButton") > -1) {
                obj.append(" (This user is currently banned)");
                obj.css({
                    'color': 'red',
                })
            }
        });
    });
}
if (window.location.pathname.indexOf("reports") > -1) {
    
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
        return e ? e == 1 ? "All" : "Team" : ""
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
    })

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
                    console.dir(value);
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
        return moment(e).format("MMMM D YYYY h:mm:ss A");
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
    } ))
}

if(window.location.pathname.indexOf('users') > -1 || window.location.pathname.indexOf('ips')) {
    
        var selectCopy = $("#banSelect").clone();
        var prevChild = $("#banSelect").prev();
        $("#banSelect").remove();
        prevChild.after(selectCopy);

        $("#unbanButton").remove();
        var unban = $("<button id='unbanButton' class='tiny'>Unban</button>");
        $("#banSelect").parent().prev().append(unban);
        
        var currentBanCount = $("#banCount").val();
        var select = $("<select id = 'removeCount'/>");
        var error = null;
        for(var i=1; i<= currentBanCount;i++)
        {
            $("<option />", {value: i, text: i}).appendTo(select);
        }
        select.appendTo($("#unbanButton").prev());
        $("#unbanButton").off('click');
        $("#unbanButton").on('click.bizkut',function(e){
            e.preventDefault();
            var removeBans = $("#removeCount").val();

            unbanCallback();

            function unbanCallback()
            {
                if(removeBans > 0)
                {
                    removeBans--;
                    $.post(document.location.href + "/unban", {}, function(e) {
                        if (!e) return;
                        if(e.alert)
                        {
                            alert(e.alert);
                            error = true;
                        }
                        if(!error){
                            unbanCallback();
                        }
                    });
                }
                else
                {
                    location.reload();
                }
            }
        });

    var banAmount = $("<select id='banAmount' />");
    for(var x = 1;x<=10;x++)
    {
        $("<option />", {value: x, text: x}).appendTo(banAmount);
    }

    $("#banSelect").parent().append(banAmount);

    var submitBan = $("<button id='submitBan' class='tiny'>BAN EM</button>");
    submitBan.on('click', function(e) {
        e.preventDefault();
        var banReason = $("#banSelect").val(); 


        var start = parseInt($("#banCount").val());
        var finish = start + parseInt($("#banAmount").val());


        banCallback();

        function banCallback()
        {
            if(start < finish)
            {
                start++;
                $.post(document.location.href + "/ban", {
                            reason: banReason,
                            banCount: start
                        }, banCallback);
            }
            else
            {
                location.reload();
            }
        }
    });
    $("#banSelect").parent().append(submitBan);
}