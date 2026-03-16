function Main() {
    this.init();
}
Main.prototype = {
    init: function() {
        if (window.location.hostname == 'multator.ru' && window.location.protocol == 'http:') {
            window.location.href = 'https://multator.ru' + window.location.pathname;
            return;
        }

        var self = this;
        setInterval(function(){
            self.status.call(self);
        }, 30000);
        $(window).bind('beforeunload', function(){
            return self.lockCheck.call(self);
        });

        $('#newmenu a.menu').click(function(e) {
            if ($(this).parent().find('ul:visible').length > 0) {
                return;
            }
            $(this).parent().find('ul').fadeIn();
            e.preventDefault();
        });
        $('#newmenu li').mouseenter(function(e) {
            var self = this;
            self.mouseOver = true;
            setTimeout(function() {
                if (self.mouseOver) $(self).find('ul').fadeIn();
            }, 100);
        });
        $('#newmenu li').mouseleave(function(e) {
            var self = this;
            self.mouseOver = false;
            setTimeout(function() {
                if (!self.mouseOver) $(self).find('ul').fadeOut();
            }, 200);
        });

        this.initSignInForm();
    },
    initSignInForm: function() {
        $('.login-popup a.signin-old-toggle').click(function(e) {
            e.preventDefault();

            var $so = $('.login-popup .signin-old');
            $so.toggleClass('hidden');
            if (!$so.hasClass('hidden')) {
                $so.find('#l_username').focus();
            }
        });


        function closePopup(e) {
            e.preventDefault();
            $('.login-popup').fadeOut();
        }

        //$('.login-popup .overlay').click(closePopup).children().click(function() {return false});
        $('.login-popup .close').click(closePopup);

        var self = this;

        $('.login-popup .reg_variant li').click(function(e) {
            e.preventDefault();
            var social = $(this).attr('data-social');
            self.loginThrough(social);
        });

        $('.login-popup .complete').click(function(e) {
            e.preventDefault();
            self.login();
        });
    },
    showLogin: function() {
        $('.login-popup').fadeIn();
        return false;
    },
    login: function() {
        $.ajax({
            type: 'POST',
            url: '/login/',
            data: ({
                'username':$('#l_username').val(),
                'password':$('#l_password').val(),
                'captcha':$('#l_captcha').val(),
                'auto_login':$('#auto_login:checked').val()?1:0
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    if (!data.result.have_social) {
                        location.href = '/profile/social';
                    }
                    else {
                        location.reload();
                    }
                    return;
                }
                else {
                    $('.captcha').show();
                    $('.login-popup .captcha img').attr('src', '/login/image.jpg?'+Math.random());
                    $('#l_captcha').val('');
                }
                if (data.errtype == 1) {
                    alert(i18n('Enter the number that you see.'));
                    $('.login-popup .captcha').removeClass('hidden');
                }
                else if (data.errtype == 2) {
                    alert(i18n('You are banned.'));
                }
                else if (data.errtype == 3) {
                    alert(i18n('Wrong number.'));
                    $('#l_captcha').focus();
                }
                else if (data.errtype == 4) {
                    alert(i18n('Password disabled. Please use password reminder for change your password.'));
                    window.location.href = '/recover/';
                }
                else if (data.errtype == 5) {
                    alert(i18n('Account disabled. Go ahead.'));
                    $('#l_captcha').focus();
                }
                else if (data.errtype == 6) {
                    alert(i18n('You are not registered.'));
                }
                else {
                    alert(i18n('Wrong username or password.'));
                    $('#l_password').val('');
                    $('#l_password').focus();
                }
            }
        });
        return false;
    },
    loginThrough: function(social) {
        if (social == 'vkontakte') {
            this.loginThroughVkontakte();
        }
        else if (social == 'facebook') {
            this.loginThroughFacebook();
        }
        else {
            alert(i18n('Sorry! Authorization through this social network temporary disabled.'));
        }
    },
    loginThroughVkontakte: function() {
        if (!window.VK) {
            alert(i18n('error'));
            return false;
        }

        VK.init({
            apiId: "2995883"
        });

        var self = this;
        VK.Auth.login(function(response) {
            if (response.status == 'connected') {
                self.ensureUser({
                    social: 'vkontakte',
                    expire: response.session.expire,
                    mid: response.session.mid,
                    secret: response.session.secret,
                    sid: response.session.sid,
                    sig: response.session.sig,
                    login: 1,
                    auto_login: $('#auto_login:checked').val() ? 1 : 0
                }, function(valid, user, errtype) {
                    if (valid && user) {
                        location.reload();
                    }
                    else {
                        alert(i18n('Seems that you are not registered or your account does not linked with social network. Please register or link your account.'));
                    }
                });
            }
            else {
                alert(i18n('Authorization failed.'));
            }
        });
    },
    loginThroughFacebook: function() {
        var self = this;

        FB.login(function(response) {
            if (response.status == 'connected') {
                self.ensureUser({
                    social: 'facebook',
                    signedRequest: response.authResponse.signedRequest,
                    login: 1,
                    auto_login: $('#auto_login:checked').val() ? 1 : 0
                }, function(valid, user, errtype) {
                    if (valid && user) {
                        location.reload();
                    }
                    else {
                        alert(i18n('Seems that you are not registered or your account does not linked with social network. Please register or link your account.'));
                    }
                });
            }
            else {
                alert(i18n('Authorization failed.'));
            }
        });
    },
    logout: function() {
        $.ajax({
            type: 'POST',
            url: '/login/exit/',
            success: function(data) {
                if (data.result == 'ok') {
                    location.reload();
                }
            }
        });
        return false;
    },
    linkSocial: function(social, step) {
        if (social == 'vkontakte') {
            this.linkSocialVkontakte(social, step);
        }
        else if (social == 'facebook') {
            this.linkSocialFacebook(social, step);
        }
        else {
            alert(i18n('Sorry! Authorization through this social network temporary disabled.'))
            return;
        }
    },
    linkSocialVkontakte: function(social, step) {
        var self = this;

        if (!window.VK) {
            alert(i18n('error'));
            return false;
        }

        VK.init({
            apiId: "2995883"
        });

        if (step == 0) {
            VK.Auth.login(function (response) {
                //console.log('login', response);
                if (response.status == 'connected') {
                    self.vk_link_session = response.session;

                    VK.Api.call('users.get', {v: '5.87', uids: response.session.mid, fields: 'photo_50'}, function (user_info) {
                        if (!user_info || !user_info.response || !user_info.response.length) {
                            console.log('VK AUTH', user_info);
                        }
                        var user_info = user_info.response[0];

                        $('.link-social .vkontakte .vk-avatar').attr('src', user_info.photo_50);
                        $('.link-social .vkontakte .vk-name').text(user_info.first_name + ' ' + user_info.last_name);
                    });

                    self.ensureUser({
                        social: social,
                        expire: response.session.expire,
                        mid: response.session.mid,
                        secret: response.session.secret,
                        sid: response.session.sid,
                        sig: response.session.sig
                    }, function(valid, user, errtype) {
                        if (user) {
                            $('.link-social .vkontakte .logged-in .confirm').hide();
                            alert(i18n('Your social network account already assigned with another user.'));
                        }
                        else {
                            $('.link-social .vkontakte .logged-in .confirm').show();
                        }
                        $('.link-social .vkontakte .logged-in').show();
                        $('.link-social .vkontakte .logged-out').hide();
                    });
                }
            });
        }

        else if (step == 1 && this.vk_link_session != undefined) {
            var session = this.vk_link_session;
            self.ensureUser({
                social: social,
                expire: session.expire,
                mid: session.mid,
                secret: session.secret,
                sid: session.sid,
                sig: session.sig,
                link: 1
            }, function(valid, user, errtype) {
                location.reload();
            });
        }

        else if (step == 2) {
            VK.Auth.logout();

            delete this.vk_link_session;
            $('.link-social .vkontakte .logged-in').hide();
            $('.link-social .vkontakte .logged-out').show();
        }
    },
    linkSocialFacebook: function(social, step) {
        var self = this;

        if (step == 0) {
            FB.login(function (response) {
                //console.log('login', response);
                if (response.status == 'connected') {
                    self.fb_link_session = response.authResponse;

                    FB.api('/me', function(user_info) {
                        $('.link-social .facebook .vk-avatar').attr('src', '//graph.facebook.com/'+user_info.id+'/picture?width=50&height=50');
                        $('.link-social .facebook .vk-name').text(user_info.first_name + ' ' + user_info.last_name);
                    });

                    self.ensureUser({
                        social: social,
                        signedRequest: response.authResponse.signedRequest
                    }, function(valid, user, errtype) {
                        if (user) {
                            $('.link-social .facebook .logged-in .confirm').hide();
                            alert(i18n('Your social network account already assigned with another user.'));
                        }
                        else {
                            $('.link-social .facebook .logged-in .confirm').show();
                        }
                        $('.link-social .facebook .logged-in').show();
                        $('.link-social .facebook .logged-out').hide();
                    });
                }
            });
        }

        else if (step == 1 && this.fb_link_session != undefined) {
            var session = this.fb_link_session;
            self.ensureUser({
                social: social,
                signedRequest: session.signedRequest,
                link: 1
            }, function(valid, user, errtype) {
                location.reload();
            });
        }

        else if (step == 2) {
            FB.logout();

            delete this.fb_link_session;
            $('.link-social .facebook .logged-in').hide();
            $('.link-social .facebook .logged-out').show();
        }
    },
    loadContent: function(url) {
        $.ajax({
            type: 'GET',
            url: url,
            success: function(data) {
                if (data.result == 'ok') {
                    $('#content').html(data.content);
                }
            }
        });
        location.href = '/last/#'+url;
    },
    showCommentsForm: function() {
        $('#comments_form').show();
        return false;
    },
    cite: function(username) {
        $('#comments_form').show();
        $('#comment_text').val('@'+username+', '+$('#comment_text').val());
        $('#comment_text').focus();
        return false;
    },
    postComment: function() {
        $('#comments_form').hide();
        $.ajax({
            type: 'POST',
            url: location.href,
            data: ({
                comment: $('#comment_text').val(),
                flags: $('.comment_flags:checked').val()
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    $('#comments').html(data.comments);
                }
                else {
                    alert(data.message);
                }
            }
        });
        return false;
    },
    loadComments: function(page) {
        if (_gaq) {
            _gaq.push(['_trackPageview', location.href]);
            _gaq.push(['_trackEvent', 'Comments', 'Page'+page, location.href]);
        }
        $.ajax({
            type: 'POST',
            url: location.href,
            data: {
                page: page
            },
            success: function(data) {
                if (data.result == 'ok') {
                    $('#comments').html(data.comments);
                }
                else {
                    alert(data.message);
                }
            }
        });
        return false;
    },
    like: function(context) {
        if (context == undefined) context = 'like';
        $.ajax({
            type: 'POST',
            url: location.href,
            data: ({
                vote: 1,
                context: context
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    $('#'+context+'_value').html(data.likes);
                    $('#'+context+'_link').addClass('active');
                }
                else {
                    //alert(data.message);
                }
            }
        });
        return false;
    },
    usernameUsed: false,
    socialValid: false,
    checkRegForm: function(el, mode) {
        var username = $('#reg_username').val();
        var pass1 = $('#reg_password1').val();
        var pass2 = $('#reg_password2').val();
        var email = $('#reg_email').val();

        var score = 0;
        var usernameValid = false;
        if (!username) {
            if (mode != 1) {
                this.toggleError($('#reg_username'), i18n('no username'));
                score++;
            }
        }
        else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            this.toggleError($('#reg_username'), i18n('incorrect username (a-z, 0-9 and "-")'));
            score++;
        }
        else if (username.length < 3) {
            this.toggleError($('#reg_username'), i18n('username too short'));
            score++;
        }
        else if (username.length > 16) {
            this.toggleError($('#reg_username'), i18n('username too long'));
            score++;
        }
        else if (this.usernameUsed && mode != 1 && mode != 2) {
            this.toggleError($('#reg_username'), i18n('username allready exists'));
            usernameValid = true;
            score++;
        }
        else {
            this.toggleError($('#reg_username'), '');
            usernameValid = true;
        }

        if (this.regFormType == 'email' || mode == 1 || mode == 2) {
            if (mode != 1) {
                if (!pass1) {
                    this.toggleError($('#reg_password1'), i18n('no password'));
                    score++;
                }
                else if (pass1 != pass2) {
                    this.toggleError($('#reg_password1'), i18n('passwords no match'));
                    score++;
                }
                else {
                    this.toggleError($('#reg_password1'), '');
                }
            }
            if (mode != 2) {
                if (!email) {
                    if (mode != 1) {
                        this.toggleError($('#reg_email'), i18n('no email'));
                        score++;
                    }
                }
                else if (!/^([a-zA-Z0-9_.-])+@(([a-zA-Z0-9-])+.)+([a-zA-Z0-9]{2,4})+$/.test(email)) {
                    this.toggleError($('#reg_email'), i18n('wrong email format'));
                    score++;
                }
                else {
                    this.toggleError($('#reg_email'), '');
                }
            }

            if (mode == 1 && !email && !username) {
                score++;
            }
        }
        else {
            if (!this.socialValid) score++;
        }

        $('.complete').attr('disabled', score > 0);

        if (el && el.id == 'reg_username' && usernameValid && mode != 1 && mode != 2) {
            var self = this;
            setTimeout(function() {
                self.checkUsername(username, function() {self.checkRegForm(null);});
            }, 1000);
        }
    },
    checkSharedAccountForm: function(el, mode) {
        var username = $('#reg_username').val();

        var score = 0;
        var usernameValid = false;
        if (!username) {
            this.toggleError($('#reg_username'), i18n('no username'));
            score++;
        }
        else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            this.toggleError($('#reg_username'), i18n('incorrect username (a-z, 0-9 and "-")'));
            score++;
        }
        else if (username.length < 3) {
            this.toggleError($('#reg_username'), i18n('username too short'));
            score++;
        }
        else if (username.length > 16) {
            this.toggleError($('#reg_username'), i18n('username too long'));
            score++;
        }
        else if (this.usernameUsed && mode != 1 && mode != 2) {
            this.toggleError($('#reg_username'), i18n('username allready exists'));
            usernameValid = true;
            score++;
        }
        else {
            this.toggleError($('#reg_username'), '');
            usernameValid = true;
        }

        $('.complete').attr('disabled', score > 0);

        if (el && el.id == 'reg_username' && usernameValid) {
            var self = this;
            setTimeout(function() {
                self.checkUsername(username, function() {self.checkSharedAccountForm(null);});
            }, 1000);
        }
    },
    createSharedAccount: function() {
        var self = this;
        $('#reg_username').attr('disabled', true);

        var data = {
            username: $('#reg_username').val()
        };

        $.ajax({
            type: 'POST',
            url: '/api/v1/sharedaccount/create',
            data: data,
            success: function(data) {
                if (data.result == 'ok') {
                    location.href = data.redirect;
                }
                else {
                    alert(data.error);
                    $('#reg_username').attr('disabled', false);
                    self.checkSharedAccountForm(null);
                }
            }
        });

        return false;
    },
    rejectSharedAccount: function(account) {
        $.ajax({
            type: 'POST',
            url: '/api/v1/sharedaccount/reject',
            data: {account: account},
            success: function(data) {
                if (data.result == 'ok') {
                    location.reload()
                }
                else {
                    alert(data.error);
                }
            }
        });

        return false;
    },
    revokeSharedAccount: function(account, username) {
        $.ajax({
            type: 'POST',
            url: '/api/v1/sharedaccount/revoke',
            data: {username: username, account: account},
            success: function(data) {
                if (data.result == 'ok') {
                    location.reload()
                }
                else {
                    alert(data.error);
                }
            }
        });

        return false;
    },
    grantSharedAccount: function(account) {
        var data = {
            account: account,
            username: $('#reg_username').val()
        };

        $.ajax({
            type: 'POST',
            url: '/api/v1/sharedaccount/grant',
            data: data,
            success: function(data) {
                if (data.result == 'ok') {
                    location.reload()
                }
                else {
                    alert(data.error);
                }
            }
        });

        return false;
    },
    socialAuth: function(type, relogin, callback) {
        var self = this;

        var handlers = {
            vkontakte: function(callback) {
                var self = this;
                this.socialValid = false;
                this.checkRegForm(null);

                $('.vkontakte .logged-out').show();
                $('.vkontakte .logged-in').hide();
                $('.vkontakte .registered').hide();
                $('.vkontakte').show();

                $('.vkontakte .complete').attr('disabled', true);

                if (!window.VK) {
                    alert(i18n('error'));
                    return;
                }

                VK.init({
                    apiId: "2995883"
                });

                function doConnected(session) {
                    self.vk_session = session;

                    $('.vkontakte .logged-out').hide();

                    VK.Api.call('users.get', {v: '5.87', uids: session.mid, fields: 'photo_50'}, function (user_info) {
                        if (user_info && user_info.error) {
                            if (Sentry) {
                                Sentry.addBreadcrumb({
                                    category: 'auth',
                                    data: {uid: session.mid, error_code: user_info.error.error_code, error_msg: user_info.error.error_msg},
                                    level: 'info'
                                });
                                Sentry.captureMessage('VK users.get');
                            }
                        }
                        else {
                            var data = user_info.response[0];

                            $('.vkontakte .vk-avatar').attr('src', data.photo_50);
                            $('.vkontakte .vk-name').text(data.first_name + ' ' + data.last_name);
                        }

                        $('.vkontakte .logged-in').show();
                    });

                    //console.log('connected', session);
                    self.ensureUser({
                        social: type,
                        expire: session.expire,
                        mid: session.mid,
                        secret: session.secret,
                        sid: session.sid,
                        sig: session.sig
                    }, function(valid, user, errtype) {
                        $('.reg-form.loading').hide();
                        $('.reg-form.vkontakte').show();

                        //console.log('ensure result', valid, user, errtype);

                        if (user) {
                            // РїРѕРєР°Р·Р°С‚СЊ РЅР°РґРїРёСЃСЊ "СѓР¶Рµ Р·Р°СЂРµРіР°РЅ"

                            $('.vkontakte .registered').show();
                            $('.vkontakte .registered .username').text(user.username);

                        }
                        else {
                            // РїРѕРєР°Р·Р°С‚СЊ С„РѕСЂРјСѓ СЃ РІС‹Р±СЂР°РЅРЅС‹Рј СЋР·РµСЂРѕРј
                            self.socialValid = true;
                            self.checkRegForm(null);
                        }
                    });
                }

                function doDisconnected() {
                    $('.vkontakte .logged-out').show();
                    $('.vkontakte .logged-in').hide();
                }

                if (relogin) {
                    delete this.vk_session;

                    $('.vkontakte .logged-out').show();
                    $('.vkontakte .logged-in').hide();
                    VK.Auth.logout();

                    VK.Auth.login(function(response) {
                        //console.log('login', response);
                        if (response.status == 'connected') {
                            doConnected(response.session);
                        }
                        else {
                            doDisconnected();
                        }
                    });
                    return;
                }

                if (this.vk_session != undefined) {
                    //console.log('use stored session');
                    doConnected(this.vk_session);
                    return;
                }

                VK.Auth.getLoginStatus(function(response) {
                    if (response.status == 'connected') {
                        doConnected(response.session);
                    }
                    else {
                        doDisconnected();
                        //console.log('No login');

                        // РїРѕРєР°Р·Р°С‚СЊ С„РѕСЂРјСѓ СЃ РєРЅРѕРїРєРѕР№ "РІРѕР№С‚Рё"
                        $('.reg-form.loading').hide();
                        $('.reg-form.vkontakte').show();

                        $('.reg-form.vkontakte .vkontakte_user').show();
                    }
                });
            },

            facebook: function(callback) {
                var self = this;
                this.socialValid = false;
                this.checkRegForm(null);

                $('.facebook .logged-out').show();
                $('.facebook .logged-in').hide();
                $('.facebook .registered').hide();
                $('.facebook').show();

                $('.facebook .complete').attr('disabled', true);

                function doConnected(session) {
                    self.fb_session = session;

                    $('.facebook .logged-out').hide();

                    FB.api('/me', function(user_info) {
                        $('.facebook .vk-avatar').attr('src', '//graph.facebook.com/'+user_info.id+'/picture?width=50&height=50');
                        $('.facebook .vk-name').text(user_info.first_name + ' ' + user_info.last_name);
                        $('.facebook .logged-in').show();
                    });

                    self.ensureUser({
                        social: type,
                        signedRequest: session.signedRequest
                    }, function(valid, user, errtype) {
                        $('.reg-form.loading').hide();
                        $('.reg-form.facebook').show();

                        //console.log('ensure result', valid, user, errtype);

                        if (user) {
                            // РїРѕРєР°Р·Р°С‚СЊ РЅР°РґРїРёСЃСЊ "СѓР¶Рµ Р·Р°СЂРµРіР°РЅ"

                            $('.facebook .registered').show();
                            $('.facebook .registered .username').text(user.username);

                        }
                        else {
                            // РїРѕРєР°Р·Р°С‚СЊ С„РѕСЂРјСѓ СЃ РІС‹Р±СЂР°РЅРЅС‹Рј СЋР·РµСЂРѕРј
                            self.socialValid = true;
                            self.checkRegForm(null);
                        }
                    });
                }

                function doDisconnected() {
                    $('.facebook .logged-out').show();
                    $('.facebook .logged-in').hide();
                }


                if (relogin) {
                    delete this.fb_session;

                    $('.vkontakte .logged-out').show();
                    $('.vkontakte .logged-in').hide();
                    FB.logout();

                    FB.login(function(response) {
                        //console.log('login', response);
                        if (response.status == 'connected') {
                            doConnected(response.authResponse);
                        }
                        else {
                            doDisconnected();
                        }
                    });
                    return;
                }

                if (this.fb_session != undefined) {
                    //console.log('use stored session');
                    doConnected(this.fb_session);
                    return;
                }

                FB.getLoginStatus(function(response) {
                    if (response.status == 'connected') {
                        doConnected(response.authResponse);
                    }
                    else {
                        //console.log('No login');
                        doDisconnected();
                    }
                });
            }
        };

        handlers[type].apply(this, callback);
    },
    ensureUser: function(data, callback) {
        //console.log('ensure', data);

        $.ajax({
            type: 'POST',
            url: '/login/social',
            data: data,
            success: function(result) {
                //console.log('/login/social', data);
                if (result.result == 'ok') {
                    callback(true, result.user);
                }
                else {
                    callback(false, null, result.errtype);
                }
            }
        });

    },
    setRegForm: function(type, relogin) {
        this.regFormType = type;

        $('.reg_variant li').removeClass('active');
        $('.reg_variant .reg-'+type).addClass('active');
        $('.reg-form').hide();

        if (type == 'email') {
            $('.reg-form.email').show();
            this.checkRegForm();
        }
        else if (type == 'vkontakte' || type == 'facebook') {
            this.socialAuth(type, relogin, function(response) {

            });
        }
        else {
            $('.reg-form.'+type).show();
        }
    },
    checkUsername: function(username, callback) {
        //alert('check username ' + username);
        var self = this;
        if (username != $('#reg_username').val()) return;
        $.ajax({
            type: 'POST',
            url: '/register/',
            data: ({
                check: username
            }),
            success: function(data) {
                if (username != $('#reg_username').val()) return;
                if (data.result == 'exist') {
                    self.usernameUsed = true;
                }
                else {
                    self.usernameUsed = false;
                }
                callback(null);
            }
        });
    },
    toggleError: function(el, error) {
        var er = el.next('.error');
        if (!er.length) {
            er = $('<span></span>');
            er.addClass('error');
            el.after(er);
        }

        if (error) {
            er.html(error);
            er.show();
        }
        else {
            er.hide();
        }
    },
    registerUsername: function() {
        var self = this;
        $('#reg_username').attr('disabled', true);
        $('#reg_password1').attr('disabled', true);
        $('#reg_password2').attr('disabled', true);
        $('#reg_email').attr('disabled', true);
        $('#reg_register').attr('disabled', true);
        $('#reg_captcha').attr('disabled', true);

        var data = {
            regtype: this.regFormType,
            username: $('#reg_username').val()
        };

        if (this.regFormType == 'email') {
            data.password = $('#reg_password1').val();
            data.email = $('#reg_email').val();
            data.captcha = $('#reg_captcha').val();
        }
        else if (this.regFormType == 'vkontakte') {
            var session = this.vk_session;

            data.expire = session.expire;
            data.mid = session.mid;
            data.secret = session.secret;
            data.sid = session.sid;
            data.sig = session.sig;
        }
        else if (this.regFormType == 'facebook') {
            var session = this.fb_session;
            data.signedRequest = session.signedRequest;
        }
        else {
            return;
        }

        $.ajax({
            type: 'POST',
            url: location.href,
            data: data,
            success: function(data) {
                if (data.result == 'ok') {
                    if (this.regFormType == 'email') {
                        $('#content .sn').html(i18n('<h1>Registration</h1>A confirmation email has been sent to you.'));
                    }
                    else {
                        $('#content .sn').html(i18n('<h1>Registration</h1>Registration complete.'));
                    }
                }
                else {
                    alert(data.error);
                    $('#reg_username').attr('disabled', false);
                    $('#reg_password1').attr('disabled', false);
                    $('#reg_password2').attr('disabled', false);
                    $('#reg_email').attr('disabled', false);
                    $('#reg_captcha').attr('disabled', false);
                    $('#img_captcha').attr('src', '/register/image.jpg?'+Math.random());
                    self.checkRegForm(null);
                }
            }
        });

        return false;
    },
    recoverPassword: function() {
        $('#reg_username').attr('disabled', true);
        $('#reg_email').attr('disabled', true);
        var self = this;
        $.ajax({
            type: 'POST',
            url: location.href,
            data: ({
                username: $('#reg_username').val(),
                email: $('#reg_email').val()
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    $('#content').html(i18n('<h2>Password recovery</h2>Recovery email has been sent to you.'));
                }
                else {
                    alert(data.error);
                    $('#reg_username').attr('disabled', false);
                    $('#reg_email').attr('disabled', false);
                    self.checkRegForm(null);
                }
            }
        });
        return false;
    },
    recoverUpdate: function() {
        $('#reg_password1').attr('disabled', true);
        $('#reg_password2').attr('disabled', true);
        $.ajax({
            type: 'POST',
            url: location.href,
            data: ({
                password: $('#reg_password1').val()
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    $('#content').html(i18n('<h2>Password recovery</h2>Password has been changed.'));
                }
                else {
                    alert(data.error);
                    $('#reg_password1').attr('disabled', false);
                    $('#reg_password2').attr('disabled', false);
                    self.checkRegForm(null);
                }
            }
        });
        return false;
    },
    showHTML: function(id, shr) {
        $('#code').val('<a href="http://'+domain+'/toon/'+id+(shr?'/sh'+shr:'')+'"><img src="http://'+domain+'/preview/'+id+'" /></a>');
        $('#code').show();
        $('#code').select();
        return false;
    },
    showBB: function(id, shr) {
        $('#code').val('[url=http://'+domain+'/toon/'+id+(shr?'/sh'+shr:'')+'][img]http://'+domain+'/preview/'+id+'[/img][/url]');
        $('#code').show();
        $('#code').select();
        return false;
    },
    setAvatar: function(id) {
        $.ajax({
            type: 'POST',
            url: '/profile/avatar',
            data: ({
                toon: id
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    $('.my-avatar-100').removeClass('processing').attr('src', '/preview/' + data.toon_id);
                }
            }
        });
        return false;
    },
    favorites: function(val) {
        $.ajax({
            type: 'POST',
            url: location.href,
            data: ({
                favorites: val
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    if (val > 0) {
                        $('.img_favorites').removeClass('img_favorites').addClass('img_favorites_r');
                        $("#favlink").click(function() {
                            return m.favorites(-1)
                        });
                    }
                    else {
                        $('.img_favorites_r').removeClass('img_favorites_r').addClass('img_favorites');
                        $("#favlink").click(function() {
                            return m.favorites(1)
                        });
                    }
                }
                else {
                    //alert(data.message);
                }
            }
        });
        return false;
    },
    giveMedal: function(buy) {
        if (!confirm(i18n('Are you sure?'))) return false;
        $.ajax({
            type: 'POST',
            url: location.href,
            data: {
                medal:1,
                buy:buy
            },
            success: function(data) {
                $('.img_toonmedal').removeClass('img_toonmedal').addClass('img_toonmedal_r');
                $("#medallink").click(function() {
                    return false;
                });
                if (data.result == 'error') {
                    alert(data.message);
                }
            }
        });
        return false;
    },
    mms: function(phone) {
        $.ajax({
            type: 'POST',
            url: location.href,
            data: {mms:1,phone:phone},
            success: function(data) {
                //console.log(data);
            }
        });
        return false;
    },
    eatMedal: function(medal_id) {
        $.ajax({
            type: 'POST',
            url: location.href,
            data: {
                medal:medal_id,
                eat:1
            },
            success: function(data) {
                alert(i18n('Done!'));
            }
        });
        return false;
    },
    register: function() {
        alert(i18n('Please sign in or register to do this.'));
        return false;
    },
    trComment: function(id, lang) {
        $('#comment-text-'+id).html('<i>Loading...</i>');
        $.ajax({
            type: 'POST',
            url: location.href,
            data: ({
                action: 'translate',
                comment: id,
                lang: lang
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    $('#comment-text-'+id).html(data.comment);
                }
            }
        });
        return false;
    },
    trToon: function(lang) {
        $.ajax({
            type: 'POST',
            url: location.href,
            data: ({
                action: 'translate',
                lang: lang
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    $('#description_text').html(data.description);
                    $('#toon_title').html(data.title);
                }
            }
        });
        return false;
    },
    checkBuySpidersForm: function(t) {
        var fp = $('#reg_phone');
        var fs = $('#reg_spiders');
        var fm = $('#reg_money');
        var ft = $('#reg_type');

        var c = 1 / CURRENCY[this.currency];
        if (t == 0) {
            var b=Math.ceil(parseInt(fs.val()) / CURRENCY[this.currency] * 100) / 100;
            if (!isNaN(b)) {
                if (b < 1) {
                    b = 1;
                    //fs.val(b * CURRENCY[this.currency]);
                }
                fm.val(b);
                this.toggleError($('#reg_spiders'), '');
            }
            else {
                this.toggleError($('#reg_spiders'), i18n('Wrong spiders count'));
            }
        }
        else if (t == 1) {
            var b=parseInt(fm.val() * CURRENCY[this.currency]);
            if (!isNaN(b)) fs.val(b);
        }

        var m = parseFloat(fm.val());
        if (isNaN(m) || m > 15000) {
            this.toggleError($('#reg_money'), i18n('Wrong spiders count'));
        }
        else {
            this.toggleError($('#reg_money'), '');
        }
        $('#reg_buy').attr('disabled', !isNaN(m) && m > 0 ? false : true);
    },
    buySpiders: function() {
        var fp = $('#reg_phone');
        var fs = $('#reg_spiders');
        var fm = $('#reg_money');
        var ft = $('#reg_type');
        var fc = $('#reg_code');
        var self = this;

        if (ft.val() == 'smsbil') {
            $('#reg_smsaccept').attr('disabled', true);
            $.ajax({
                type: 'POST',
                url: location.href,
                data: {type: ft.val(), code: fc.val()},
                success: function(data) {
                    $('#reg_smsaccept').attr('disabled', false);
                    if (data.result == 'ok') {
                        fc.val('');
                        $('#form_info').html(data.message);
                    }
                    else {
                        $('#form_info').html(data.message);
                    }
                }
            });

            return false;
        }

        var score = 0;
        var m=parseFloat(fm.val());

        if (!isNaN(m) && m > 0) {
            fs.val(parseInt(m * CURRENCY[this.currency]));
        }
        else {
            score++;
            this.toggleError($('#reg_money'), i18n('Wrong spiders count'));
        }

        if (ft.val() == 'qiwi' && !/^\(\d\d\d\) ?\d\d\d-\d\d-\d\d$/.test(fp.val())) {
            score++;
            this.toggleError($('#reg_phone'), i18n('Wrong phone format. Should be (123) 456-78-90'));
        }
        if (score == 0) {
            fp.attr('disabled', true);
            fm.attr('disabled', true);
            fs.attr('disabled', true);
            $('#reg_buy').attr('disabled', true);
            $('#form_info').show();
            $('#form_info').html(i18n('Invoicing...'));
            $.ajax({
                type: 'POST',
                url: location.href,
                data: ({
                    amount: fm.val(),
                    phone: fp.val(),
                    type: ft.val(),
                    currency:self.currency
                }),
                success: function(data) {
                    if (data.result == 'ok') {
                        if (data.type == 'qiwi') {
                            $('#form_info').html(i18n('Invoice complete.'));
                        }
                        else if (data.type.substr(0,8) == 'webmoney') {
                            for (var f in data.form) {
                                $('#' + f).val(data.form[f]);
                            }
                            $('#webmoney_form').submit();
                        }
                        else if (data.type == 'paypal') {
                            window.location.href = data.url;
                        }
                        else {
                            $('#rx_id').val(data.id);
                            $('#rx_crc').val(data.crc);
                            $('#rx_label').val(data.label);
                            $('#rx_amount').val(data.amount);
                            $('#rx_label').val(data.label);
                            $('#robox_form').submit();
                        }
                    }
                    else {
                        $('#form_info').html(i18n('Invoice error.'));
                        fp.attr('disabled', false);
                        fm.attr('disabled', false);
                        fs.attr('disabled', false);
                        $('#reg_buy').attr('disabled', false);
                    }
                }
            });
        }
        return false;
    },
    checkBuyGoodPlace: function(min) {
        var ft = $('#reg_toon');
        var fs = $('#reg_spiders');
        var t = parseInt(fs.val());
        var score = 0;
        if (isNaN(t) || t < min) {
            score++;
            this.toggleError(fs, i18n('Wrong spiders count'));
        }
        else {
            this.toggleError(fs, '');
        }
        var r = new RegExp('^https?://(?:www\\.)?'+domain+'/toon/[A-Za-z0-9_-]{11,12}(?:/continues)?$');
        if (!r.test(ft.val())) {
            score++;
            this.toggleError(ft, i18n('Wrong toon url'));
        }
        else {
            this.toggleError(ft, '');
        }
        $('#reg_buy').attr('disabled', score > 0);
    },
    buyGoodPlace: function() {
        $('#reg_toon').attr('disabled', true);
        $('#reg_spiders').attr('disabled', true);
        $('#reg_buy').attr('disabled', true);
        $('#form_info').show();
        $('#form_info').html('...');
        $.ajax({
            type: 'POST',
            url: location.href,
            data: ({
                spiders: $('#reg_spiders').val(),
                toon: $('#reg_toon').val()
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    $('#form_info').html(data.message);
                }
                else {
                    $('#form_info').html(data.message ? data.message : i18n('error'));
                    $('#reg_spiders').attr('disabled', false);
                    $('#reg_toon').attr('disabled', false);
                    $('#reg_buy').attr('disabled', false);
                }
            }
        });
        return false;
    },
    download: function(toon, format, cost, force) {
        if (!force && !confirm(i18n('Are you sure?'))) return false;
        var self = this;
        $.ajax({
            type: 'POST',
            url: location.href,
            data: ({
                toon: toon,
                format:format
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    $('#download_info_'+format).html(data.info);
                    if (data.refresh) {
                        setTimeout(function() {
                            self.download(toon, format, cost, true)
                        }, 30000);
                    }
                }
                else {
                    alert(data.message ? data.message : i18n('error'));
                }
            }
        });
        return false;
    },
    increaseEvent: function(event, spiders) {
        $('#spiders_'+event).attr('disabled', true);
        $('#reg_buy_'+event).attr('disabled', true);
        $('#form_info_'+event).show();
        $('#form_info_'+event).html('...');
        $.ajax({
            type: 'POST',
            url: location.href,
            data: ({
                spiders: spiders,
                event: event
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    $('#form_info_'+event).html(data.message);
                }
                else {
                    $('#form_info_'+event).html(data.message ? data.message : i18n('error'));
                    $('#spiders_'+event).attr('disabled', false);
                    $('#reg_buy_'+event).attr('disabled', false);
                }
            }
        });
        return false;
    },
    download: function(toon, format, cost, force) {
        if (!force && !confirm(i18n('Are you sure?'))) return false;
        var self = this;
        $.ajax({
            type: 'POST',
            url: location.href,
            data: ({
                toon: toon,
                format:format
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    $('#download_info_'+format).html(data.info);
                    if (data.refresh) {
                        setTimeout(function() {
                            self.download(toon, format, cost, true)
                        }, 30000);
                    }
                }
                else {
                    alert(data.message ? data.message : i18n('error'));
                }
            }
        });
        return false;
    },
    postMessage: function() {
        $.ajax({
            type: 'POST',
            url: location.href,
            data: ({
                message: $('#message_text').val()
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    $('#messages').html(data.messages);
                }
                else {
                    alert(data.error);
                }
            }
        });
        $('#message_text').val('');
        return false;
    },
    pmIgnore: function() {
        var ign = $('#cb_ignore:checked').val()?2:1;
        $.ajax({
            type: 'POST',
            url: location.href,
            data: {
                ignore: ign
            },
            success: function(data) {
                if (ign==2) $('#lbl_ignore').addClass('red');
                else $('#lbl_ignore').removeClass('red');
                return;
            }
        });
    },
    expandPlayer: function(v){
        if (v) {
            $('#player_container').addClass('player_expanded');
        }
        else {
            $('#player_container').removeClass('player_expanded');
        }
        document.cookie='expanded='+(v?1:0)+'; path=/; expires=Mon, 01-Jan-2020 00:00:00 GMT';
        return false;
    },
    toggleAttachSound: function() {
        var s = $('#sound_uploader');
        if (s.is(':visible')) {
            s.hide();
            $('#attachsound_link').removeClass('active');
        }
        else {
            s.show();
            $('#attachsound_link').addClass('active');
        }
    },
    toggleDownload: function() {
        var s = $('#download_links');
        if (s.is(':visible')) {
            s.hide();
            $('#download_link').removeClass('active');
        }
        else {
            s.show();
            $('#download_link').addClass('active');
        }
        return false;
    },
    spam: function(message_id, spam) {
        if (spam == 1) {
            if (!confirm(i18n('This message will be sent to administrator.'))) return false;
        }
        $.ajax({
            type: 'POST',
            url: location.href,
            data: ({
                message: message_id,
                spam: spam
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    $('#messages').html(data.messages);
                }
                else {
                    alert(data.error);
                }
            }
        });
        return false;
    },
    status: function() {
        $.ajax({
            type: 'POST',
            url: '/status',
            data: {
                url:location.href
            },
            success: function(data) {
                return;
            }
        });
    },
    sendtosand: function() {
        if (!confirm(i18n('Send to sandbox?'))) return false;
        $.ajax({
            type: 'POST',
            url: location.href,
            data: {
                sendtosand:1
            },
            success: function(data) {

            }
        });
        return false;
    },
    currency: 'RUB',
    showPay: function(pay, currency) {
        $('#reg_type').val(pay);
        $('.pay_switch').hide();
        $('.pay_' + pay).show();
        $('.a_pay').removeClass('selected');
        $('.a_' + pay).addClass('selected');
        if (pay == 'smsbil') $('.pay_sum').hide();
        else $('.pay_sum').show();
        if (!currency) currency = 'RUB';
        if (this.currency != currency) {
            this.currency = currency;
            this.checkBuySpidersForm(1);
        }
        var txt = '1 '+i18n(currency)+' = <b class="red">' + CURRENCY[currency] + '</b> ' + i18n('spiders');

        $('#exchnage_rate').html(txt);
        $('#currency').html(i18n(currency));
        return false;
    },
    updateSmsTariffs: function(o) {
        var c = $('#sms_country').val();
        $.ajax({
            type: 'POST',
            url: '/spiders/sms/',
            data: {
                country:c,
                operator:o==null?'':o
            },
            success: function(data) {
                if (data.operators) {
                    var list=$('#sms_operator');
                    list.find('option').remove();
                    for (var i in data.operators) {
                        list.append('<option value="'+data.operators[i]+'">'+data.operators[i]+'</option>');
                    }
                }
                if (data.html) {
                    $('#tariffs').html(data.html);
                }
            }
        });
        return false;
    },
    setNickColor: function(color) {
        $.ajax({
            type: 'POST',
            url: location.href,
            data: {
                color:color
            },
            success: function(data) {
                if (data.result == 'ok') {
                    location.reload();
                }
            }
        });
        return false;
    },
    removeMedal: function(medal) {
        if (!confirm(i18n('Are you sure?'))) return false;
        $.ajax({
            type: 'POST',
            url: location.href,
            data: {
                removemedal:medal
            },
            success: function(data) {
                if (data.result == 'ok') {
                    $('#medal_'+medal).remove();
                }
            }
        });
        return false;
    },
    removeDraft: function() {
        if (!confirm(i18n('Are you sure?'))) return false;
        $.ajax({
            type: 'POST',
            url: location.href,
            data: {
                removedraft:1
            },
            success: function(data) {
                if (data.result == 'ok') {
                    location.href = data.redirect;
                }
            }
        });
        return false;
    },
    switchAlbum: function(id, link) {
        $.ajax({
            type: 'POST',
            url: '/profile/',
            data: ({
                album:1,
                toon: id
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    if (data['in']) $(link).html(i18n('In album'));
                    else $(link).html(i18n('Not in album'));
                }
            }
        });
        return false;
    },
    switchContest: function(id, cb) {
        $(cb).attr('disabled', 'disabled');
        $.ajax({
            type: 'POST',
            url: location.href,
            data: ({
                action: 'contest',
                id: id
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    $(cb).removeAttr('disabled');
                    if (data['in']) $(cb).attr('checked', 'checked');
                    else $(cb).removeAttr('checked');
                }
            }
        });
        return false;
    },
    moderatorVote: function(id, vote, cnt) {
        $.ajax({
            type: 'POST',
            url: '/admin/help/',
            data: ({
                toon_id:id,
                vote: vote
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    //alert('ok ;)');
                    if (vote > 1 && data.hide) $('.toon_preview_'+id).fadeOut();
                    $('.toon_preview_'+id+' .selected').removeClass('selected');
                    $('.toon_preview_'+id+' .mvote'+vote).addClass('selected');
                    $('#moderator_help .selected').removeClass('selected');
                    $('#moderator_help .mvote'+vote).addClass('selected');
                }
            }
        });
        return false;
    },
    locks: {},
    lockExit: function(id, lock) {
        if (lock == undefined) lock = true;
        this.locks[id] = lock;
    },
    lockCheck: function() {
        for (var id in this.locks) {
            if (this.locks[id]) {
                return i18n('Something changed on this page.');
            }
        }
        return undefined;
    },
    hideNotify: function(notify_id) {
        $('#notify_wrap').slideUp('fast');
        $.ajax({
            type: 'POST',
            url: '/profile/',
            data: ({
                'action':'hidenotify',
                'notify':notify_id
            })
        });
        return false;
    },
    share: {
        def: function(a, toon_id) {
            window.open(a.href, 'share', 'width=600,height=600,toolbar=0');
            return false;
        },
        vk: function(a, toon_id) {

            /*VK.init({
                apiId: "2995883",
                nameTransportPath: "http://multator.ru/xd_receiver.htm"
            });
            var postToonError = function(errtype) {
                alert(errtype);
                m.share.def(a, toon_id);
            }
            var postToon2 = function(toon_id, session) {
                VK.Api.call('wall.post', {
                    message: i18n('Draw cartoons at Toonator.com'),
                    attachments:'http://multator.ru/toon/'+toon_id
                    }, function(r) {
                    if (r && r.response && (r.response.processing || r.response.post_id)) {
                        checkPostToon(toon_id, session, 0);
                    }
                    else {
                        postToonError(i18n('Post canceled'));
                    }
                });
            }
            var checkPostToon = function(toon_id, session, ntry) {
                VK.Api.call('wall.get', {
                    filter:'owner',
                    count:1
                }, function (r2) {
                    var ok = false;
                    var post_id = 0;
                    var from_id = 0;
                    if (r2.response.length > 1 && r2.response[1].attachment && r2.response[1].attachment.link && r2.response[1].attachment.link.url) {
                        var url = r2.response[1].attachment.link.url;
                        post_id = r2.response[1].id;
                        from_id = r2.response[1].from_id;
                        if (/^http:\/\/multator\.ru/.test(url)) {
                            ok = true;
                        }
                    }
                    if (!ok && ntry < 3) {
                        setTimeout(function() {
                            checkPostToon(toon_id, session, ntry+1);
                        }, 500);
                    }
                    else {
                        session.action = 'share';
                        session.post_id = post_id;
                        session.from_id = from_id;
                        session.toon_id = toon_id;
                        $.ajax({type:'POST', url:location.href, data:session, success: function(data) {
                                if (data.result == 'ok' && data.message) {
                                    alert(data.message);
                                }
                        }});
                    }
                });
            }
            //VK.Auth.getLoginStatus(function(r) {
            //    if (r.session) {
            //        postToon2(toon_id, r.session);
            //    }
            //    else {
                    VK.Auth.login(function(r2) {
                        if (r2.session) {
                            postToon2(toon_id, r2.session);
                        }
                        else {
                            postToonError(i18n('You need to authenticate'));
                        }
                    }, 8192);
            //    }
            //});
            return false;
            */
        }
    },
    congameSelectNext: function() {
        if (!confirm(i18n('Are you sure?'))) return false;
        $.ajax({
            type: 'POST',
            url: location.href,
            data: ({'congamesel':1}),
            success: function(data) {
                location.reload();
            }
        });
        return false;
    },
    socialAssign: function(social) {
        if (social == 'vk') {
            if (!window.VK) {
                alert(i18n('error'));
                return false;
            }

            VK.init({
                apiId: "2995883",
                nameTransportPath: "http://multator.ru/xd_receiver.htm"
            });
            VK.Auth.login(function(r2) {
                alert('hm');
                if (r2.session) {
                    alert('ok');
                }
                else {
                    alert('РћС€РёР±РєР°. Р’РѕР·РјРѕР¶РЅРѕ РІС‹ РЅРµ РІРѕС€Р»Рё РІ Р’РљРѕРЅС‚Р°РєС‚Рµ.');
                }
            }, 1);
        }
        return false;
    },
    promoHidden: null,
    switchPromo: function(promo, txtShow, txtHide) {
        var d = $('#promo_'+promo);
        var act;
        if (d.is(':visible')) {
            $('#promo_'+promo+'_switcher').html(txtHide);
            d.hide();
            act = 'hidepromo';
            if (this.promoHidden == null) this.promoHidden = {};
            this.promoHidden[promo] = d.html();
            d.html('');
        }
        else {
            $('#promo_'+promo+'_switcher').html(txtShow);
            d.show();
            if (this.promoHidden != null && this.promoHidden[promo] != undefined) {
                d.html(this.promoHidden[promo]);
            }
            act = 'showpromo';
        }
        $.ajax({
            type: 'POST',
            url: '/profile',
            data: ({
                action: 'promo',
                action: act,
                promo: promo
            })
        });
        return false;
    },
    blackListAdd: function(username) {
        if (!confirm(i18n('Are you sure that you want to ban user?'))) return false;
        $.ajax({
            type: 'POST',
            url: '/profile/',
            data: ({
                action: 'blacklist',
                user: username
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    alert(i18n('User banned!'));
                    $('ul.blacklist').append('<li data-bl-username="'+username+'"><a href="#" onclick="m.blackListRemove(\''+username+'\')">'+i18n('Remove')+'</a> '+username+'</li>');
                }
                else {
                    alert(data.message);
                }
            }
        });
        return false;
    },
    blackListRemove: function(username) {
        $.ajax({
            type: 'POST',
            url: '/profile/',
            data: ({
                action: 'blacklist',
                user: username,
                remove: 1
            }),
            success: function(data) {
                if (data.result == 'ok') {
                    $('li[data-bl-username="'+username+'"]').remove();
                }
                else {
                    alert(data.message);
                }
            }
        });
        return false;
    },
    showToonChooser: function(title, query, callback) {
        var $popup = $('.toon-chooser-popup');

        $popup.find('.title').html(title);
        var page = query.page == undefined ? 1 : query.page;
        var loadMore = false;
        var loading = true;

        $popup.find('.toons-list').html('');
        $popup.find('.toons-list').on('click', 'a.toon_link', function(e) {
            e.preventDefault();
            var toon_id = $(this).attr('data-toon-id');
            callback(toon_id);
            close();
        });
        $popup.find('.load-more button').on('click', function(e) {
            e.preventDefault();

            query.page = ++page;
            load();
        });

        $('body').css('overflow', 'hidden');
        function close() {
            $('body').css('overflow', 'auto');
            $popup.fadeOut();
        }

        $popup.find('.close').on('click', function(e) {
            e.preventDefault();
            $popup.find('.load-more button').off('click');
            $popup.find('.toons-list').off('click', 'a.toon_link');
            close();
        });

        $popup.find('.content').on('scroll', function(e) {
            if (!loading && loadMore && this.scrollTop + this.offsetHeight > this.scrollHeight - 50) {
                query.page = ++page;
                load();
            }
        });

        function load() {
            loading = true;
            $popup.addClass('loading');
            $.getJSON('/profile/toons', query, function (response) {
                loading = false;
                $popup.removeClass('loading');
                $popup.find('.toons-list').append(response.html);
                loadMore = response.more;
                if (loadMore) {
                    $popup.find('.load-more').show();
                }
                else {
                    $popup.find('.load-more').hide();
                }
            });
        }

        $popup.fadeIn();
        load();
    },
    changeAvatar: function() {
        var self = this;
        this.showToonChooser(i18n('Choose avatar'), {'for': 'avatar'}, function(toon_id) {
            $('.my-avatar-100').addClass('processing').attr('src', '/preview/' + toon_id);
            self.setAvatar(toon_id);
        });
        return false;
    },
    chooseGoodplaceToon: function(site) {
        var self = this;
        this.showToonChooser(i18n('Choose toon for Good Place'), {'for': 'goodplace', 'site': site}, function(toon_id) {
            $('#reg_toon').val(window.location.protocol + '//' + window.location.hostname + '/toon/' + toon_id);
            self.checkBuyGoodPlace();
        });
        return false;
    },
    toggleToonMore: function() {
        $('.more-options').toggleClass('hidden');
        return false;
    },
    showCustomPopup: function(url, data, callback) {
        var $popup = $('.user-custom-popup');
        $.post(url, data, function(response) {
            if (response.result == 'ok') {
                $popup.find('.title').html(response.title);
                $popup.find('.content').html(response.html);

                callback.apply($popup, arguments);

                $('body').css('overflow', 'hidden');
                $popup.fadeIn();
            }
            else {
                alert(response.message);
            }
        }, 'json').fail(function() {

        });

        $popup.find('.close').on('click', function(e) {
            e.preventDefault();
            close();
        });

        function close() {
            $popup.find('.close').off('click');
            $('body').css('overflow', 'auto');
            $popup.fadeOut();
        }

        $popup.close = close;
    },
    sendToContest: function(toon_id) {
        this.showCustomPopup('/toon/'+toon_id+'/contest-apply', {}, function() {
            var $popup = this;


            $popup.find('.contest').each(function() {
                var $contest = $(this);
                var contest_type = $contest.attr('data-type');
                var contest_id = $contest.attr('data-id');

                $contest.find('.apply button').click(function() {
                    if ($contest.find('.rules').hasClass('hidden')) {
                        $contest.find('.rules').removeClass('hidden');
                        return;
                    }

                    var accepted = $contest.find('input.accept:checked').length;
                    if (!accepted) {
                        alert(i18n('You must accept rules to apply.'));
                        return;
                    }

                    $.post('/toon/'+toon_id+'/contest-apply', {
                        type: contest_type,
                        id: contest_id
                    }, function(response) {
                        if (response.result == 'ok') {
                            $popup.find('.content').html(response.html);
                            setTimeout(function() {
                                $popup.close();
                            }, 1000);
                        }
                        else {
                            alert(response.message);
                        }
                    }, 'json');
                });
            });
        });
        return false;
    }
}
var m;
$(function(){
    m = new Main();
});