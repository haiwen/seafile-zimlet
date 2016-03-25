/* 
 *   Zimbra Seafile
 *   Copyright (C) 2016 
 */

function com_zimbra_seafile_HandlerObject() {
    com_zimbra_seafile_HandlerObject.settings = {};
}

/**
 * Makes the Zimlet class a subclass of ZmZimletBase.
 *
 */
com_zimbra_seafile_HandlerObject.prototype = new ZmZimletBase();
com_zimbra_seafile_HandlerObject.prototype.constructor = com_zimbra_seafile_HandlerObject;
var SeafileZimlet = com_zimbra_seafile_HandlerObject;

/**
* This method gets called by the Zimlet framework when the zimlet loads.
*  
*/
SeafileZimlet.prototype.init =
function() {
    com_zimbra_seafile_HandlerObject.version=this._zimletContext.version;
    com_zimbra_seafile_HandlerObject.settings['seafile_service_url'] = this._zimletContext.getConfig("seafile_service_url");
    com_zimbra_seafile_HandlerObject.settings['shib_connection_timeout'] = this._zimletContext.getConfig("shib_connection_timeout");

    // this._simpleAppName = this.createApp("Seafile", "zimbraIcon", "Connect you Seafile profile");
    //this.doDrop();

    var seafile_zimlet = this;
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";
    // Listen to message from child window
    eventer(messageEvent,function(e) {
        var key = e.message ? "message" : "data";
        var data = e[key];
        if (data) {
            // data format: "test.seafile@mail.fr@xxxxxxxxxxxxxxxxxx"
            console.log(data);
            seafile_zimlet.status('Shib SSO success', ZmStatusView.LEVEL_INFO);

            /* close iframe, and use token to list libraries */
            $('#seafile-shib-ifrm').remove();
            clearTimeout(SeafileZimlet.timer);

            var splits = JSON.parse(data).split('@');
            var seafile_token = splits[splits.length - 1];
            if (seafile_token && seafile_token.length == 40) {
                // set to cookie, and open file chooser
                createCookie('seafile_token', seafile_token, 1);
                seafile_zimlet.showSeafileChooser();
            }
        }
    },false);

};

function createCookie(name,value,days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

SeafileZimlet.eraseCookie = function (name) {
    createCookie(name,"",-1);
}

function HTMLescape(html) {
    return document.createElement('div')
        .appendChild(document.createTextNode(html))
        .parentNode
        .innerHTML;
}


SeafileZimlet.prototype.initializeAttachPopup =
function(menu, controller) {
        var mi = controller._createAttachMenuItem(menu, "Seafile",
                        new AjxListener(this, this.showSeafileChooser));
};

SeafileZimlet.prototype.status = function(text, type, timeout) {
    var timeout = typeof timeout !== 'undefined' ?  timeout : 5;
    var transitions = [ ZmToast.FADE_IN ];
    transitions = transitions.concat(Array(timeout-2).fill(ZmToast.PAUSE)); // remove first and last two seconds
    transitions.push(ZmToast.FADE_OUT);
    appCtxt.getAppController().setStatusMsg(text, type, null, transitions);
}; 

SeafileZimlet._showSeafileLoginDialog =
function() {
    console.log('sso failed, remove ifrm, show login dialog');
    this.status('Shibboleth SSO failed, you need to manually input your email/password', ZmStatusView.LEVEL_WARNING);

    $('#seafile-shib-ifrm').remove();

    var sDialogTitle = "Login to Seafile";
    
    this.pView = new DwtComposite(this.getShell()); //creates an empty div as a child of main shell div
    this.pView.getHtmlElement().innerHTML = this._createDialogLoginView(); // insert html to the dialogbox

    var loginButtonId = Dwt.getNextId();
    var loginButton = new DwtDialog_ButtonDescriptor(
        loginButtonId, "Login", DwtDialog.ALIGN_RIGHT);

    var dialog_args = {
        title	: sDialogTitle,
        view	: this.pView,
        parent	: this.getShell(),
        standardButtons : [DwtDialog.CANCEL_BUTTON],
        extraButtons : [loginButton]
    }

    // pass the title, view & buttons information to create dialog box
    this.pbDialog = new ZmDialog(dialog_args);
    this.pbDialog.setButtonListener(DwtDialog.CANCEL_BUTTON, new AjxListener(this, this._cancelBtnListener));
    this.pbDialog.setButtonListener(loginButtonId, new AjxListener(this, this._loginBtnListener));

    this.pbDialog.popup(); //show the dialog
}

SeafileZimlet.prototype.showSeafileChooser=
function() {
    var SeafileToken = readCookie("seafile_token");
    var seafile_zimlet = this;

    if (SeafileToken == null) {
        // Open iframe to shibboleth SSO, if connection is done in 10s,
        // remove login window timer, and remove iframe; otherwise,
        // remove that iframe, and show login dialog.

        var shib_login_src = com_zimbra_seafile_HandlerObject.settings['seafile_service_url'] + '/shib-login/?next=/seahub/shib-success/';
        var timeout = com_zimbra_seafile_HandlerObject.settings['shib_connection_timeout'];

        $('<iframe>', {
            src: shib_login_src,
            id:  'seafile-shib-ifrm',
        }).appendTo('body');
        console.log('append ifrm');
        seafile_zimlet.status('Connecting to Shibboleth, please wait...', ZmStatusView.LEVEL_INFO, timeout);

        SeafileZimlet.timer = setTimeout(
            $.proxy(SeafileZimlet._showSeafileLoginDialog, seafile_zimlet),
            timeout*1000);
        console.log('timer set in ' + timeout);

    } else { // show 'attach file' popup
        var sDialogTitle = "Attach file(s) from Seafile";

        seafile_zimlet.pView = new DwtComposite(seafile_zimlet.getShell()); //creates an empty div as a child of main shell div
        seafile_zimlet.pView.setSize("400px", "300px"); // set width and height
        seafile_zimlet.pView.getHtmlElement().style.overflow = "auto"; // adds scrollbar

        var $fileTreeContainer = $(seafile_zimlet.pView.getHtmlElement());

        var attachButtonId = Dwt.getNextId();
        var attachButton = new DwtDialog_ButtonDescriptor(
                attachButtonId, "Attach", DwtDialog.ALIGN_RIGHT);

        seafile_zimlet.pbDialog = new ZmDialog({
            title: sDialogTitle,
            view: seafile_zimlet.pView,
            parent: seafile_zimlet.getShell(),
            standardButtons: [DwtDialog.CANCEL_BUTTON],
            extraButtons: [attachButton],
            disposeOnPopDown:true
        });
        seafile_zimlet.pbDialog.setButtonListener(DwtDialog.CANCEL_BUTTON, new AjxListener(seafile_zimlet, seafile_zimlet._cancelBtnListener));
        seafile_zimlet.pbDialog.setButtonListener(attachButtonId, new AjxListener(seafile_zimlet, seafile_zimlet._attachBtnListener));

        // show file tree
        var seafile_service_url = com_zimbra_seafile_HandlerObject.settings['seafile_service_url'];
        var seafile_libraries_url = seafile_service_url + '/api2/repos/?type=mine';
        jQuery.ajax({
            url: seafile_libraries_url,
            type: 'GET',
            dataType: 'json',
            beforeSend: function(request) {
                request.setRequestHeader("Authorization", "Token " + readCookie("seafile_token"));
            },
            success: function(data) {
                var repos = FileTree.formatRepoData(data);
                FileTree.renderFileTree($fileTreeContainer, repos, {
                    beforeSend: function(request) {
                        request.setRequestHeader("Authorization", "Token " + readCookie("seafile_token"));
                    },
                    getUrl: function(repo_id, path) {
                        return seafile_service_url + '/api2/repos/' + repo_id + '/dir/?p=' + encodeURIComponent(path);
                    }
                });

                seafile_zimlet.pbDialog.popup(); //show the dialog

            },
            error: function(xhr, textStatus, errorThrown) {
                $fileTreeContainer.html('<p style="text-align:center;color:red;margin-top:20px;">Failed to list seafile libraries.</p>');
                seafile_zimlet.pbDialog.popup(); //show the dialog
            }
        });
    }
};


/**
 * Creates the login dialog view.
 * 
 */
SeafileZimlet.prototype._createDialogLoginView =
function() {
    var html = AjxTemplate.expand("com_zimbra_seafile.templates.Tab#LoginDlgTmpl");
    return html;
};

/**
 * The "login" button listener.
 * 
*/
SeafileZimlet.prototype._loginBtnListener =
function() {
    var user_name="";
    var password="";
    var token = "";
    var seafile_service_url = com_zimbra_seafile_HandlerObject.settings['seafile_service_url'];
    var seafile_token_url = seafile_service_url + '/api2/auth-token/';
    var seafile_zimlet = this;

    username = jQuery.trim(jQuery('#seafile_login_dlg_username').val());
    password = jQuery.trim(jQuery('#seafile_login_dlg_password').val());
    if (!username || !password) {
        alert('username or password is missing')
        return false;
    }

    jQuery.ajax({
        url: seafile_token_url,
        type: 'POST',
        dataType: 'json',
        data: {username: username, password: password},
        success: function(data) {
            createCookie('seafile_token', data.token, 1);
            // close login dialog and show files chooser dialog
            seafile_zimlet.pbDialog.popdown();
            seafile_zimlet.showSeafileChooser();
        },
        error: function(xhr, textStatus, errorThrown) {
            alert('login failed.');
        }
    });
};

/**
 * The "attach" button listener.
 * 
*/
SeafileZimlet.prototype._attachBtnListener =
function() {
    var seafile_zimlet = this;

    var selected_files = [];
    var $fileTreeContainer = $(seafile_zimlet.pView.getHtmlElement());
    $('[name="selected"][checked="checked"]', $fileTreeContainer).each(function(index, item) {
        var val =  $(item).val(); // repo_id + path
        if (val.charAt(val.length - 1) != '/') {
            selected_files.push(val);
        }
    });

    var seafile_service_url = com_zimbra_seafile_HandlerObject.settings['seafile_service_url'];
    $(selected_files).each(function(index, item) {
        var repo_id = item.substring(0, item.indexOf('/')) ;
        var path = item.substring(item.indexOf('/'));

        var seafile_share_link_url = seafile_service_url + '/api2/repos/' + repo_id + '/file/shared-link/';
        jQuery.ajax({ // get or create file shared link
            url: seafile_share_link_url,
            type: 'PUT',
            dataType: 'text',
            data: {'p': path},
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", "Token " + readCookie("seafile_token"));
            },
            success: function(data, textStatus, jqXHR) {
                // at present(Thu Jan 21 11:38:42 CST 2016), the returned shared_link(url) is stored in header 'Location'
                var shared_link = jqXHR.getResponseHeader('Location');

                var composeView = appCtxt.getCurrentView();
                var filename = HTMLescape(path.substr(path.lastIndexOf('/') + 1));
                var attached_item = '<p>' + filename + ': ' + '<a href="' + shared_link + '">' + shared_link + '</a></p>';
                composeView.getHtmlEditor().setContent(composeView.getHtmlEditor().getContent() + attached_item);

                seafile_zimlet.pbDialog.popdown();
            },
            error: function(xhr, textStatus, errorThrown) {
                var error_msg;
                if (xhr.responseText) {
                    error_msg = $.parseJSON(xhr.responseText).error_msg;
                } else {
                    error_msg = "Failed.";
                }
                alert(error_msg);
            }
        });

    });
}

/**
 * The "DISMISS" button listener.
 * 
*/
SeafileZimlet.prototype._cancelBtnListener =
function() {
        this.pbDialog.popdown(); //hide the dialog

};

SeafileZimlet.prototype.appActive =
function(appName, active) {
	
	switch (appName) {
		case this._simpleAppName: {
		
			var app = appCtxt.getApp(appName); // get access to ZmZimletApp

			break;
		}
	}
	// do something
};

/**
 * This method gets called by the Zimlet framework when the application is opened for the first time.
 *  
 * @param	{String}	appName		the application name		
 */

SeafileZimlet.prototype.appLaunch =
function(appName){
	switch (appName) {
		case this._simpleAppName: {
			// do something
			var app = appCtxt.getApp(appName); // get access to ZmZimletApp
			var content = this._createTabView();
			app.setContent(content); // write HTML to app
			break;
		}
	}
};

/**
 * Creates the tab view using the template.
 * 
 * @return	{String}	the tab HTML content
 */

SeafileZimlet.prototype._createTabView =
function() {
	return	AjxTemplate.expand("com_zimbra_seafile.templates.Tab#Main");		
};
