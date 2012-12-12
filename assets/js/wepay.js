WePay = WePay || {};
WePay.widgets = WePay.widgets || [];
WePay.init = function () {
    WePay.$ = null;
    WePay.loaded_widgets = false;
    var anchor_class = "wepay-widget-button";
    WePay.load_widgets = function () {
        if (!WePay.$) {
            return;
        }
        if (WePay.widgets && WePay.widgets.length) {
            WePay.$.each(WePay.widgets, function (i, widget) {
                if (!widget.loaded) {
                    widget.anchors = [];
                    WePay.create_dialog(widget);
                    widget.handle_click = WePay.build_handle_click(widget);
                    widget.build_extras = WePay.build_widget_extras(widget);
                    WePay.$("#" + widget.anchor_id + "." + anchor_class).each(function (j, anchor) {
                        if (!WePay.$(anchor).data('init')) {
                            WePay.init_widget_anchor(widget, anchor);
                            return false;
                        }
                    });
                    widget.loaded = true;
                }
            });
            WePay.$("." + anchor_class).each(function (i, anchor) {
                if (WePay.$(anchor).data('init')) {
                    return;
                }
                var widget = WePay.get_widget_by_anchor_id(anchor.id);
                if (!widget) {
                    return;
                }
                WePay.init_widget_anchor(widget, anchor);
            });
        } else {
            alert("No WePay Widgets found!");
        }
    };
    WePay.init_widget_anchor = function (widget, anchor) {
        anchor.widget = widget;
        anchor.widget.build_extras(anchor.widget, WePay.$(anchor));
        widget.anchors.push(anchor);
        WePay.$(anchor).unbind('click').unbind('mouseup').unbind('mousedown').on('click', function (e) {
            e.preventDefault();

            // added by crux
            RJ.ecard.donationAmount = WePay.$('input[name="' + widget.anchor_id + '"]').val();
            $.removeCookie('rollingjubilee');
            $.cookie('rollingjubilee', JSON.stringify(RJ.ecard));

            this.widget.handle_click(this.widget, WePay.$(this));
            WePay.track_event("Widget Clicked", widget);
        }).data('init', true);
        WePay.track_event("Widget Loaded", widget);
    };
    WePay.get_widget_by_anchor_id = function (anchor_id) {
        if (!anchor_id) {
            return null;
        }
        var widget_obj = null;
        WePay.$.each(WePay.widgets, function (i, widget) {
            if (widget.anchor_id == anchor_id) {
                widget_obj = widget;
                return false;
            }
        });
        return widget_obj;
    };
    WePay.build_widget_extras = function (widget) {
        switch (widget.widget_type) {
            case "event":
            case "event_buy_now":
                break;
            case "donation_campaign":
                return function (widget, widget_anchor) {
                    if (widget.widget_options.donor_chooses || (widget.widget_options.donation_amount === undefined && widget.widget_options.list_suggested_donations === undefined)) {
                        var widget_anchor_width = widget_anchor.outerWidth(true);
                        WePay.$('<input type="text" name="' + widget.anchor_id + '" placeholder="0.00" class="wepay-widget-input donation-input-pay" />').insertBefore(widget_anchor);
                    }
                };
            case "donation_campaign_progress":
                return function (widget, widget_anchor) {
                    if (widget.object_id === undefined) {
                        return;
                    }
                    widget_anchor.hide();
                    WePay.get_ajax_data(widget, true, function (data) {
                        if (data.error) {
                            widget_anchor.show();
                            console.warn('There was an issue getting progress widget data');
                            return;
                        }
                        WePay.$(data.response).insertBefore(widget_anchor);
                        widget_anchor.remove();
                    });
                };
            case "store_item_buy_now":
            case "store_item_add_to_cart":
                return function (widget, widget_anchor) {
                    WePay.get_ajax_data(widget, true, function (data) {
                        var sold_out_text = WePay.get_option(widget, 'button_text_sold_out', 'Sold Out'),
                            box_class = data.has_extras ? '' : "wepay-no-options";
                        if (!data.is_available) {
                            widget_anchor.text(sold_out_text).toggleClass('wepay-green item-sold-out');
                        }
                        widget_anchor.box = WePay.$('<div class="wepay-store-widget ' + box_class + '"></div>').insertBefore(widget_anchor).html(data.item_extras).on('click mouseenter', '.item-photo-show', function (e) {
                            e.stopPropagation();
                            if (WePay.$(this).hasClass('selected')) {
                                return;
                            }
                            WePay.$(this).closest('.item-image-box').find('.selected').removeClass('selected').end().find('img.item-photo').attr('src', WePay.$(this).data('imageSrc')).end().end().addClass('selected');
                        });
                        widget_anchor.appendTo(widget_anchor.box);
                    });
                };
            case "store_cart_view":
                return function (widget, widget_anchor) {
                    var show_item_count = WePay.get_option(widget, 'show_item_count', true);
                    if (!show_item_count) {
                        return;
                    }
                    widget_anchor.append('<span class="item-count" />');
                    WePay.listen('store_cart_update:' + widget.object_id, function (data) {
                        widget_anchor.find('.item-count').text(WePay.helpers.cart_count_string(data.cart_item_count, show_item_count));
                    });
                    WePay.get_ajax_data(widget, false, function (data) {
                        widget_anchor.find('span.item-count').text(WePay.helpers.cart_count_string(data.cart_item_count, show_item_count));
                    });
                };
            case "store":
                return function (widget, widget_anchor) {
                    WePay.get_ajax_data(widget, true, function (data) {
                        widget.last_page = data.last_page;
                        var paging_box = ".store-pagination";
                        widget_anchor.box = WePay.$('<div class="wepay-storefront-widget"></div>').insertBefore(widget_anchor).html(data.store_extras).on('click', '.store-items a, a.store-cart', function (e) {
                            var widget_link = WePay.$(this).data('widgetLink');
                            if (widget_link) {
                                e.stopPropagation();
                                e.preventDefault();
                                WePay.set_dialog_src(widget, widget_link + '?iframe=1');
                                WePay.show_dialog(widget.dialog);
                                return;
                            }
                        }).on('click', '.store-pagination a', function (e) {
                            e.preventDefault();
                            var current_page = parseInt(WePay.$(this).closest(paging_box).find('a.selected').data('pageNumber'), 10),
                                new_page_number = parseInt(WePay.$(this).data('pageNumber'), 10);
                            if (!new_page_number) {
                                if (WePay.$(this).hasClass('next')) {
                                    new_page_number = (current_page < widget.last_page) ? current_page + 1 : widget.last_page;
                                } else if (WePay.$(this).hasClass('prev')) {
                                    new_page_number = (current_page > 1) ? current_page - 1 : 1;
                                }
                            }
                            if (current_page == new_page_number) {
                                return;
                            }
                            widget_anchor.box.find(paging_box).find('a').each(function (i, elem) {
                                if (WePay.$(this).hasClass('selected')) {
                                    WePay.$(this).removeClass('selected');
                                }
                                if (WePay.$(this).data('pageNumber') == new_page_number.toString()) {
                                    WePay.$(this).addClass('selected');
                                }
                            });
                            WePay.get_ajax_data(widget, true, function (data) {
                                var items_box = widget_anchor.box.find('.store-items-box').find('.store-items').html(data.store_extras);
                                items_box.data('pageNumber', new_page_number);
                            }, WePay.get_ajax_path(widget) + new_page_number + '/items');
                        });
                        WePay.listen('store_cart_update:' + widget.object_id, function (data) {
                            widget_anchor.box.find('.item-count').text(WePay.helpers.cart_count_string(data.cart_item_count));
                        });
                        widget_anchor.hide();
                    });
                };
            default:
                alert("Invalid WePay Widget Type!");
                break;
        }
        return function (widget, widget_anchor) {};
    };
    WePay.build_handle_click = function (widget) {
        if (WePay.$('#' + widget.anchor_id).length) {
            WePay.$('#' + widget.anchor_id)[0].onclick = null;
        }
        switch (widget.widget_type) {
            case "event":
                break;
            case "event_buy_now":
                return function (widget) {
                    var data = {}, form;
                    data["tickets[" + WePay.get_option(widget, 'ticket_id') + "][quantity]"] = 1;
                    form = WePay.create_form(widget, data, true);
                    WePay.show_dialog(widget.dialog);
                };
            case "donation_campaign":
                return function (widget) {
                    if (!widget.dialog.attr('src')) {
                        var donation_input = WePay.$('input[name="' + widget.anchor_id + '"]');
                        if (widget.widget_options.donor_chooses || donation_input.length > 0 || ((widget.widget_options.donation_amount === undefined || widget.widget_options.donation_amount === null) && widget.widget_options.list_suggested_donations === undefined)) {
                            if (donation_input.length > 0) {
                                widget.widget_options.donation_amount = donation_input.val();
                                if (widget.widget_options.donation_amount < 1) {
                                    donation_input.css({
                                        "border": "2px solid #E06C6C"
                                    }).delay(5000).queue(function (nxt) {
                                        donation_input.css({
                                            "border": "2px solid #CECECE"
                                        });
                                        nxt();
                                    });
                                }
                                if (widget.widget_options.donation_amount.indexOf('.') < 0) {
                                    widget.widget_options.donation_amount += ".00";
                                }
                                if (widget.widget_options.donation_amount.indexOf('.') > 0) {
                                    widget.widget_options.donation_amount = widget.widget_options.donation_amount.replace(".", "").replace(",", "");
                                    widget.widget_options.donor_decides = true;
                                }
                                WePay.create_src(widget);
                            }
                        } else if (widget.widget_options.donation_amount >= 1 || widget.widget_options.list_suggested_donations) {
                            WePay.create_src(widget);
                        }
                    }
                    if (widget.widget_options.donation_amount >= 1 || widget.widget_options.list_suggested_donations) {
                        if (!widget.widget_options.allow_cover_fee && !widget.widget_options.enable_recurring && !widget.widget_options.allow_anonymous && widget.widget_options.donation_amount >= 1) {
                            var data = {};
                            data["campaign_id"] = widget.object_id;
                            data["amount"] = widget.widget_options.donation_amount;
                            var form = WePay.create_form(widget, data, true);
                        }
                        WePay.show_dialog(widget.dialog);
                    }
                };
            case "donation_campaign_progress":
                return function (widget) {
                    var href = WePay.$('#' + widget.anchor_id).attr('href');
                    window.open(href);
                };
            case "store_item_buy_now":
            case "store_item_add_to_cart":
                return function (widget, widget_anchor) {
                    var data = {}, form;
                    WePay.$('select, input', widget_anchor.parent()).each(function () {
                        var t = WePay.$(this);
                        data[t.attr('name')] = t.val();
                    });
                    data.action = widget.widget_type;
                    form = WePay.create_form(widget, data, true);
                    WePay.show_dialog(widget.dialog);
                };
            case "store_cart_view":
                break;
            case "store":
                break;
            default:
                alert("Invalid WePay Widget Type!");
                break;
        }
        return WePay.handle_click;
    };
    WePay.handle_click = function (widget) {
        WePay.create_src(widget);
        WePay.show_dialog(widget.dialog);
    };
    WePay.create_src = function (widget) {
        if (!widget.dialog.attr('src')) {
            WePay.set_dialog_src(widget, WePay.get_start_path(widget));
        }
    };
    WePay.set_dialog_src = function (widget, src) {
        widget.dialog.iframe.attr('src', WePay.iframe_persist.update_url(src));
    };
    WePay.get_start_path = function (widget) {
        var path = '';
        switch (widget.widget_type) {
            case "event":
            case "event_buy_now":
                path = '/events/' + widget.object_id + '/widget/view/';
                return WePay.domain + path + '?iframe=1';
                break;
            case "donation_campaign":
                var allow_cover_fee = (WePay.get_option(widget, 'allow_cover_fee', false) ? 1 : 0),
                    enable_recurring = (WePay.get_option(widget, 'enable_recurring', false) ? 1 : 0),
                    allow_anonymous = (WePay.get_option(widget, 'allow_anonymous', false) ? 1 : 0),
                    list_suggested_donations = (WePay.get_option(widget, 'list_suggested_donations', false) ? 1 : 0);
                path = '/donations/view_widget';
                return WePay.domain + path + "/" + widget.object_id + "/" + widget.widget_options.donation_amount + "/" + enable_recurring + "/" + allow_anonymous + "/" + allow_cover_fee + "/" + list_suggested_donations + "?iframe=1";
            case "donation_campaign_progress":
                break;
            case "store_item_buy_now":
            case "store_item_add_to_cart":
                path = '/stores/' + WePay.get_option(widget, 'store_id') + '/widget/item/' + widget.object_id;
                return WePay.iframe_persist.update_url(WePay.domain + path + '?iframe=1');
            case "store_cart_view":
                path = '/stores/' + widget.object_id + '/widget/cart/';
                return WePay.iframe_persist.update_url(WePay.domain + path + '?iframe=1');
            case "store":
                path = '/stores/' + widget.object_id + '/widget/store/';
                return WePay.iframe_persist.update_url(WePay.domain + path + '?iframe=1');
        }
        return WePay.domain + path + "/" + widget.object_id + '?iframe=1';
    };
    WePay.get_ajax_path = function (widget) {
        switch (widget.widget_type) {
            case "store_item_buy_now":
            case "store_item_add_to_cart":
                return WePay.domain + "/stores/" + WePay.get_option(widget, 'store_id') + "/widget/ajax/get_item/" + widget.object_id;
            case "store_cart_view":
                return WePay.domain + "/stores/" + widget.object_id + "/widget/ajax/get_cart/";
            case "store":
                return WePay.domain + "/stores/" + widget.object_id + "/widget/ajax/get_store/";
            case "donation_campaign_progress":
                return WePay.domain + "/donation_campaign_ajax/progress_widget/" + widget.object_id + "/" + widget.widget_options['total_collected'];
            default:
                return '';
        }
    };
    WePay.get_ajax_data = function (widget, cache, on_load, url) {
        url = url || WePay.get_ajax_path(widget);
        WePay.$.ajax({
            url: url + '?callback=?',
            dataType: 'json',
            data: widget.widget_options,
            cache: cache,
            success: function (data) {
                if (on_load) {
                    on_load(data);
                }
            }
        });
    };
    WePay.get_option = function (widget, option_name, default_val) {
        if (!widget.widget_options || (typeof widget.widget_options[option_name] === 'undefined')) {
            return default_val;
        }
        return widget.widget_options[option_name];
    };
    WePay.create_dialog = function (widget) {
        if ((typeof widget.widget_options.no_dialog !== undefined) && widget.widget_options.no_dialog) {
            return;
        }
        if (!WePay.widgets_div) {
            WePay.$("body").append(WePay.$("<div>").attr("id", "wepay-widgets-dialogs-wrapper").attr("style", "display:none;"));
            WePay.widgets_div = WePay.$("#wepay-widgets-dialogs-wrapper");
            WePay.widgets_div.click(function (e) {
                if (WePay.open_dialog && e.target === this) {
                    WePay.close_dialog(WePay.open_dialog);
                }
            });
        }
        widget.dialog = WePay.$("<div>").addClass('wepay-widget-dialog').attr("style", "display:none;").text(' ');
        widget.dialog.data('widget', widget);
        widget.dialog.top_bar = WePay.$("<div>").addClass('wepay-dialog-topbar');
        widget.dialog.top_bar.append(WePay.$("<h2>").text("WePay"));
        widget.dialog.top_bar.close = WePay.$("<div>").addClass("wepay-dialog-close").append(WePay.$("<a>").attr("href", "javascript:void(0)").text("Close"));
        widget.dialog.top_bar.close.click(function (e) {
            if (WePay.open_dialog) {
                WePay.close_dialog(WePay.open_dialog);
            }
        });
        widget.dialog.top_bar.append(widget.dialog.top_bar.close);
        widget.dialog.append(widget.dialog.top_bar);
        widget.iframe_id = "wepay_iframe_" + (new Date()).getTime();
        widget.dialog.iframe = WePay.$("<iframe name=\"" + widget.iframe_id + "\" marginheight=\"0\" marginwidth=\"0\" frameborder=\"0\" ></iframe>").css("width", "600px").css("min-height", "150px");
        widget.dialog.append(widget.dialog.iframe);
        widget.dialog.spinner = WePay.$('<div class="spinner"><img src="' + WePay.domainStatic + '/img/progress.gif" /></div>');
        widget.dialog.append(widget.dialog.spinner);
        WePay.widgets_div.append(widget.dialog);
    };
    WePay.create_form = function (widget, data, auto_submit) {
        var src = WePay.get_start_path(widget),
            form = WePay.$('<form action="' + src + '" method="POST" target="' + widget.iframe_id + '" ></form>').hide();
        for (var i in data) {
            form.append(WePay.$('<input type="hidden" name="' + i + '" value="' + data[i] + '" />'));
        }
        WePay.$("body").append(form);
        if (auto_submit) {
            form.submit();
        }
        return form;
    };
    WePay.is_mobile = {
        _check: function (match) {
            var match_regex = new RegExp(match, 'i');
            return !!navigator.userAgent.match(match_regex);
        },
        Android: function () {
            return this._check('Android');
        },
        BlackBerry: function () {
            return this._check('BlackBerry');
        },
        iOS: function () {
            return this._check('iPhone|iPad|iPod');
        },
        Opera: function () {
            return this._check('Opera Mini');
        },
        Windows: function () {
            return this._check('IEMobile');
        },
        any: function () {
            var t = this;
            return (t.Android() || t.BlackBerry() || t.iOS() || t.Windows() || t.Opera());
        }
    };
    WePay.show_dialog = function (dialog) {
        if (WePay.open_dialog) {
            WePay.open_dialog.hide();
        }
        dialog.spinner.show();
        dialog.iframe.css("height", "0px");
        WePay.widgets_div.show();
        WePay.open_dialog = dialog;
        WePay.modal.fadeIn('slow');
        dialog.fadeIn('slow');
    };
    WePay.close_dialog = function (dialog) {
        WePay.modal.fadeOut();
        dialog.fadeOut();
        WePay.widgets_div.fadeOut();
    };
    WePay.track_event = function (event_name, widget) {
        if (window._gaq !== undefined) {
            window._gaq.push(['WePay._trackEvent', "WePay Widget", event_name, WePay.JSON.stringify({
                "widget_type": widget.widget_type,
                "object_id": widget.object_id,
                "source": window.location.href
            })]);
        }
    };
    WePay.helpers = {
        cart_count_string: function (count, parentheses) {
            if (parentheses && parentheses === 'no_parentheses') {
                return count ? count : '0';
            } else {
                return count ? ' (' + count + ')' : '';
            }
        }
    };
    WePay.listen = WePay.listen || function (event_name, response_function) {
        WePay.callback_events = WePay.callback_events || {};
        WePay.callback_events[event_name] = WePay.callback_events[event_name] || [];
        WePay.callback_events[event_name].push(response_function);
    };
    WePay.trigger = WePay.trigger || function (event_name, data) {
        var callbacks = WePay.callback_events[event_name];
        if (callbacks) {
            for (var i = 0; i < callbacks.length; i++) {
                var callback = callbacks[i];
                callback(data);
            }
        }
    };
    WePay.listen('iframe_resize', function (data) {
        if (WePay.open_dialog) {
            WePay.open_dialog.spinner.hide();
            if (WePay.open_dialog.iframe.css('height') != data.height + 'px') {
                WePay.open_dialog.iframe.css('height', data.height + 'px');
            }
            if (typeof data.width !== 'undefined' && (WePay.open_dialog.css('width') != data.width + 'px' || WePay.open_dialog.iframe.css('width') != data.width + 'px')) {
                WePay.open_dialog.css({
                    'width': data.width + 'px',
                    'max-width': data.width + 'px'
                });
                WePay.open_dialog.iframe.css({
                    'width': data.width + 'px',
                    'max-width': data.width + 'px'
                });
            }
            if (WePay.$(window).height() < data.height + 60 || WePay.$("body").width() < 600) {
                WePay.$("#wepay-widgets-dialogs-wrapper").css({
                    'position': 'absolute',
                    'top': WePay.$(window).scrollTop()
                });
            } else {
                WePay.$('#wepay-widgets-dialogs-wrapper').css({
                    'position': WePay.is_mobile.any() ? 'absolute' : 'fixed',
                    'top': WePay.is_mobile.any() ? WePay.$(window).scrollTop() : '0'
                });
            }
            WePay.open_dialog.iframe.show();
        }
    });
    WePay.listen("iframe_window_title", function (data) {
        if (WePay.open_dialog) {
            WePay.open_dialog.top_bar.find("h2").text(data.title || "WePay");
        }
        data = {
            "wepay_message_type": "set_external_account_uri",
            "external_account_uri": window.location.href
        };
        WePay.open_dialog.iframe[0].contentWindow.postMessage(WePay.JSON.stringify(data), WePay.domain);
    });
    WePay.listen("iframe_close", function (data) {
        if (WePay.open_dialog) {
            WePay.close_dialog(WePay.open_dialog);
        }
    });
    WePay.listen("iframe_checkout_complete", function (data) {
        var widget = WePay.open_dialog.data('widget');
        if (widget.widget_options.redirect_url) {
            top.location.href = widget.widget_options.redirect_url;
        }
    });
    WePay.receiveMessage = WePay.receiveMessage || function (msg) {
        try {
            var data = WePay.JSON.parse(msg.data);
            WePay.trigger(data.wepay_message_type, data);
        } catch (e) {}
    };
    WePay.load_script = function (src_url, on_load, load_async) {
        var script = document.createElement("script");
        script.src = src_url;
        script.type = 'text/javascript';
        script.async = load_async === null ? true : !! load_async;
        if (on_load) {
            if (script.addEventListener) {
                script.addEventListener('load', on_load, false);
            } else if (script.attachEvent) {
                script.attachEvent('onreadystatechange', function () {
                    if (script.readyState === 'complete' || script.readyState === 'loaded') {
                        on_load();
                    }
                });
            } else {
                script.onload = on_load;
            }
        }
        document.getElementsByTagName('head')[0].appendChild(script);
        return script;
    };
    WePay.load_jquery = function () {
        if (!WePay.domain || !WePay.domainStatic) {
            var src = WePay.script.src;
            WePay.domain = 'https://www.wepay.com';
            WePay.domainStatic = 'https://static.wepay.com';
        }
        if (jQuery && WePay.$ === null) {
            WePay.$ = jQuery.noConflict(true);
            if (typeof JSON === 'object' && JSON.stringify) {
                WePay.JSON = {};
                WePay.JSON.stringify = JSON.stringify;
                WePay.JSON.parse = JSON.parse;
            } else {
                WePay.JSON = {};
                WePay.JSON.parse = function (src) {
                    if (!src) return;
                    var filtered = src.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, '');
                    if (/^[\],:{}\s]*$/.test(filtered)) {
                        return eval('(' + src + ')');
                    } else {
                        throw new SyntaxError('Error parsing JSON, source is not valid.');
                    }
                };
                WePay.JSON.stringify = function (o) {
                    if (o === null) {
                        return 'null';
                    }
                    var type = typeof o;
                    if (type === 'undefined') {
                        return undefined;
                    }
                    if (type === 'number' || type === 'boolean') {
                        return o.toString();
                    }
                    if (type === 'string') {
                        return WePay.JSON.quote_string(o);
                    }
                    if (type === 'object') {
                        if (typeof o.toJSON === 'function') {
                            return WePay.JSON.stringify(o.toJSON());
                        }
                        if (o.constructor === Date) {
                            var month = o.getUTCMonth() + 1,
                                day = o.getUTCDate(),
                                year = o.getUTCFullYear(),
                                hours = o.getUTCHours(),
                                minutes = o.getUTCMinutes(),
                                seconds = o.getUTCSeconds(),
                                milli = o.getUTCMilliseconds();
                            if (month < 10) {
                                month = '0' + month;
                            }
                            if (day < 10) {
                                day = '0' + day;
                            }
                            if (hours < 10) {
                                hours = '0' + hours;
                            }
                            if (minutes < 10) {
                                minutes = '0' + minutes;
                            }
                            if (seconds < 10) {
                                seconds = '0' + seconds;
                            }
                            if (milli < 100) {
                                milli = '0' + milli;
                            }
                            if (milli < 10) {
                                milli = '0' + milli;
                            }
                            return '"' + year + '-' + month + '-' + day + 'T' + hours + ':' + minutes + ':' + seconds + '.' + milli + 'Z"';
                        }
                        if (o.constructor === Array) {
                            var ret = [];
                            for (var i = 0; i < o.length; i++) {
                                ret.push(WePay.JSON.stringify(o[i]) || 'null');
                            }
                            return '[' + ret.join(',') + ']';
                        }
                        var name, val, pairs = [];
                        for (var k in o) {
                            type = typeof k;
                            if (type === 'number') {
                                name = '"' + k + '"';
                            } else if (type === 'string') {
                                name = WePay.JSON.quote_string(k);
                            } else {
                                continue;
                            }
                            type = typeof o[k];
                            if (type === 'function' || type === 'undefined') {
                                continue;
                            }
                            val = WePay.JSON.stringify(o[k]);
                            pairs.push(name + ':' + val);
                        }
                        return '{' + pairs.join(',') + '}';
                    }
                };
                WePay.JSON.quote_string = function (string) {
                    var escapeable = /["\\\x00-\x1f\x7f-\x9f]/g,
                        meta = {
                            '\b': '\\b',
                            '\t': '\\t',
                            '\n': '\\n',
                            '\f': '\\f',
                            '\r': '\\r',
                            '"': '\\"',
                            '\\': '\\\\'
                        };
                    if (string.match(escapeable)) {
                        return '"' + string.replace(escapeable, function (a) {
                            var c = meta[a];
                            if (typeof c === 'string') {
                                return c;
                            }
                            c = a.charCodeAt();
                            return '\\u00' + Math.floor(c / 16).toString(16) + (c % 16).toString(16);
                        }) + '"';
                    }
                    return '"' + string + '"';
                };
            }
        }
        WePay.iframe_persist.init({
            identifier_prefix: 'encrypted_object_cart_',
            url_identifier: {
                split: '/',
                index: 4
            }
        });
        if (!WePay.css) {
            var widget_css = '/css/widgets.v2.css';
            if (typeof WePay.minify == 'undefined') widget_css = '/min' + widget_css;
            WePay.css = WePay.$("head").append(WePay.$("<link>").attr({
                type: "text/css",
                media: "screen",
                rel: "stylesheet",
                href: WePay.domainStatic + widget_css
            }));
        }
        if (!WePay.modal) {
            WePay.modal = WePay.$("<div>").text(' ').attr('id', 'wepay-widget-modal').css({
                'background-color': '#FFF',
                'opacity': 0.6,
                'display': 'none'
            });
            WePay.modal.click(function (modal) {
                WePay.close_dialog(WePay.open_dialog);
            });
            WePay.$("body").append(WePay.modal);
        }
        if (WePay.domain == "https://www.wepay.com") {
            window._gaq = window._gaq || [];
            _gaq.push(['WePay._setAccount', 'UA-5707285-6']);
            _gaq.push(['WePay._setDomainName', 'www.wepay.com']);
            WePay.ga = WePay.load_script('https://ssl.google-analytics.com/ga.js', null, true);
        } else if (WePay.domain == "https://stage.wepay.com") {
            window._gaq = window._gaq || [];
            _gaq.push(['WePay._setAccount', 'UA-5707285-18']);
            _gaq.push(['WePay._setDomainName', 'stage.wepay.com']);
            WePay.ga = WePay.load_script('https://ssl.google-analytics.com/ga.js', null, true);
        }
        WePay.load_widgets();
        if (!WePay.listening) {
            WePay.$(window).bind("message", function (e) {
                WePay.receiveMessage(e.originalEvent);
            });
            WePay.listening = true;
        }
    };
    if (!WePay.$) {
        WePay.load_script("https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js", function () {
            WePay.load_jquery();
        });
    } else {
        WePay.load_jquery();
    }
    WePay.loaded = true;
    WePay.iframe_persist = {
        persist_id: null,
        field_name: 'encrypted_object',
        target_name: 'encrypted_object_target',
        settings: {
            url_identifier: null,
            identifier_prefix: null
        },
        init: function (settings) {
            if (!WePay.$ || !WePay.local_cookie) {
                return;
            }
            var that = this;
            WePay.$.extend(that.settings, settings);
            try {
                this.persist_id = WePay.JSON.parse(WePay.local_cookie.get());
            } catch (e) {
                this.persist_id = {};
            }
            if (!this.persist_id || typeof this.persist_id !== 'object') {
                this.persist_id = {};
            }
            this._ajax();
            this._listener();
        },
        _ajax: function () {
            var that = this;
            WePay.ajax = WePay.$.ajax;
            WePay.$.ajax = function (options) {
                options.url = that.update_url(options.url);
                WePay.ajax.call(WePay.$, options).done(function (data) {
                    that.process_response(data);
                });
            };
        },
        _listener: function () {
            var that = this;
            WePay.$(window).bind('message', function (event) {
                if (event && event.originalEvent && event.originalEvent.data && event.originalEvent.data.indexOf(that.field_name) !== -1 && event.originalEvent.data.indexOf(that.target_name) !== -1) {
                    var event_data = WePay.JSON.parse(event.originalEvent.data),
                        persist_id = that.get_persist_id(event_data[that.target_name]);
                    if (event_data[that.field_name] && persist_id !== event_data[that.field_name]) {
                        that.set_persist_id(event_data[that.target_name], event_data[that.field_name]);
                    }
                }
            });
        },
        update_url: function (url) {
            if (this.persist_id && url && url.length) {
                var identifier = 'field_name',
                    persist_id = '';
                if (this.settings.url_identifier) {
                    if (this.settings.url_identifier.regex && this.settings.url_identifier.regex instanceof RegExp) {
                        var results = this.settings.url_identifier.regex.exec(url);
                        if (results && results.length > 0 && (this.settings.url_identifier.index + 1) <= results.length) {
                            identifier = results[this.settings.url_identifier.index];
                        }
                    } else if (this.settings.url_identifier.split) {
                        var results = url.split(this.settings.url_identifier.split);
                        if (results && results.length > 0 && (this.settings.url_identifier.index + 1) <= results.length) {
                            identifier = results[this.settings.url_identifier.index];
                        }
                    } else {
                        identifier = this.settings.url_identifier;
                    }
                }
                if (this.settings.identifier_prefix) {
                    identifier = this.settings.identifier_prefix + identifier;
                }
                persist_id = this.get_persist_id(identifier);
                if (persist_id) {
                    url += (url.indexOf('?') === -1) ? '?' : '&' + this.field_name + '=' + persist_id;
                }
            }
            return url;
        },
        process_response: function (data) {
            if (data[this.target_name]) {
                var persist_id = this.get_persist_id(data[this.target_name]);
                if (data[this.field_name] && persist_id !== data[this.field_name]) {
                    this.set_persist_id(data[this.target_name], data[this.field_name]);
                }
            }
        },
        get_persist_id: function (target) {
            if (this.persist_id && this.persist_id.hasOwnProperty(target)) {
                return this.persist_id[target];
            }
            return '';
        },
        set_persist_id: function (target, new_id) {
            this.persist_id[target] = new_id;
            WePay.local_cookie.set(WePay.JSON.stringify(this.persist_id));
        }
    };
    WePay.local_cookie = {
        name: 'wepay-object',
        set: function (value, expiration) {
            if (!expiration) {
                var date = new Date();
                date.setTime(date.getTime() + (14 * 24 * 60 * 60 * 1000));
                expiration = date.toGMTString();
            }
            document.cookie = this.name + '=' + value + ';expires=' + expiration + ';path=/';
        },
        get: function () {
            var cookie_split = document.cookie.split(';'),
                cookie_split_length = cookie_split.length;
            var name = this.name + '=';
            for (var i = 0; i < cookie_split_length; i++) {
                var data = WePay.$.trim(cookie_split[i]);
                if (data.indexOf(name) === 0) {
                    return data.substring(name.length, data.length);
                }
            }
            return null;
        }
    };
};
if (!WePay.loaded) {
    WePay.init();
} else {
    WePay.load_widgets();
}