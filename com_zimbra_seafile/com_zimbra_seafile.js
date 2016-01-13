/* 
 *   Zimbra SeaFile
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
var SeaFile = com_zimbra_seafile_HandlerObject;

/**
* This method gets called by the Zimlet framework when the zimlet loads.
*  
*/
SeaFile.prototype.init =
function() {
    com_zimbra_seafile_HandlerObject.version=this._zimletContext.version;
    com_zimbra_seafile_HandlerObject.settings['seafile_service_url'] = this._zimletContext.getConfig("seafile_service_url");

    this._simpleAppName = this.createApp("Seafile", "zimbraIcon", "Connect you Seafile profile");
    //this.doDrop();
	
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

SeaFile.eraseCookie = function (name) {
    createCookie(name,"",-1);
}


SeaFile.prototype.initializeAttachPopup =
function(menu, controller) {
        var mi = controller._createAttachMenuItem(menu, "Seafile",
			new AjxListener(this, this.showSeaFileChooser));
};

SeaFile.prototype.showSeaFileChooser=
function() {
        // if (this.pbDialog) { //if zimlet dialog already exists...
	// 	this.pbDialog.popup(); //simply popup the dialog
	// 	return;
	// }

	var SeaFileToken = readCookie("seafile_token");
        console.log("Seafile Token Cookie > "+SeaFileToken);
        if(SeaFileToken == null)
	{
            var sDialogTitle = "SeaFile";
	    var sStatusMsg = "Login";
	    
	    this.pView = new DwtComposite(this.getShell()); //creates an empty div as a child of main shell div
	    this.pView.setSize("250", "150"); // set width and height
	    this.pView.getHtmlElement().style.overflow = "auto"; // adds scrollbar
	    this.pView.getHtmlElement().innerHTML = this._createDialogLoginView(); // insert html to the dialogbox

            var loginButtonId = Dwt.getNextId();
            var loginButton = new DwtDialog_ButtonDescriptor(
                loginButtonId, "Login", DwtDialog.ALIGN_CENTER);

            var dialog_args = {
                title	: sDialogTitle,
		view	: this.pView,
                parent	: this.getShell(),
                standardButtons : [DwtDialog.DISMISS_BUTTON],
                extraButtons : [loginButton]
            }

	    // pass the title, view & buttons information to create dialog box
            this.pbDialog = new ZmDialog(dialog_args);
            this.pbDialog.setButtonListener(
                DwtDialog.DISMISS_BUTTON,
                new AjxListener(this, this._dismissBtnListener));
            this.pbDialog.setButtonListener(
                loginButtonId,
                new AjxListener(this, this._loginBtnListener));

	    this.pbDialog.popup(); //show the dialog
            appCtxt.getAppController().setStatusMsg(sStatusMsg);

        }else{
            var sDialogTitle = "SeaFile";
            var sStatusMsg = "Add File";
            var seafile_service_url = com_zimbra_seafile_HandlerObject.settings['seafile_service_url'];
            var seafile_libraries_url = seafile_service_url + '/api2/repos/';
            var seafile_zimlet = this;

            jQuery.ajax({       // list libraries
                url: seafile_libraries_url,
                type: 'GET',
                dataType: 'json',
                beforeSend: function (request) {
                    request.setRequestHeader("Authorization", "Token " + readCookie("seafile_token"));
                },
                success: function(data) {
                    seafile_zimlet.pView = new DwtComposite(seafile_zimlet.getShell()); //creates an empty div as a child of main shell div
                    seafile_zimlet.pView.setSize("400px", "300px"); // set width and height
                    seafile_zimlet.pView.getHtmlElement().style.overflow = "auto"; // adds scrollbar

                    jQuery.each(data, function(idx, val) {
                        if (val.type == 'repo') {
                            // only list owned repos
                            seafile_zimlet.pView.getHtmlElement().innerHTML += "<div><span><img src=\"/service/zimlet/_dev/com_zimbra_seafile/lib.png\"><a href='#' class='js-seafile-lib' data-rid='" + val.id + "' style='text-decoration:underline;' >" +
                                val.name + "</a></span></div>";
                        }
                    });

                    jQuery('.js-seafile-lib').click(function() {
                        var repo_id = jQuery(this).data('rid');
                        var seafile_dirs_url = seafile_service_url + '/api2/repos/' + repo_id + '/dir/';

                        jQuery.ajax({ // list dir entries
                            url: seafile_dirs_url,
                            type: 'GET',
                            dataType: 'json',
                            beforeSend: function (request) {
                                request.setRequestHeader("Authorization", "Token " + readCookie("seafile_token"));
                            },
                            success: function(data) {
                                seafile_zimlet.pView.getHtmlElement().innerHTML = "";
                                jQuery.each(data, function(idx, val) {
                                    if (val.type == 'file') {
                                        seafile_zimlet.pView.getHtmlElement().innerHTML += "<div><input type=\"checkbox\" class=\"js-seafile-file\" data-rid='" + repo_id + "' data-path='/" + val.name + "'><span>" + val.name + "</span></div>";
                                    } else {
                                        seafile_zimlet.pView.getHtmlElement().innerHTML += "<div><span><img src=\"/service/zimlet/_dev/com_zimbra_seafile/folder.png\"><a href='#' class='js-seafile-lib' data-rid='" + val.id + "' style='text-decoration:underline;' >" +
                                            val.name + "</a></span></div>";
                                    }

                                });

                            },
                            error: function(xhr, textStatus, errorThrown) {
                                alert('List seafile dir failed.');
                                console.log(xhr.responseText);
                            }
                        });

                    });

                    var attachButtonId = Dwt.getNextId();
                    var attachButton = new DwtDialog_ButtonDescriptor(
                        attachButtonId, "Attach", DwtDialog.ALIGN_RIGHT);
                    
                    seafile_zimlet.pbDialog = new ZmDialog({title:sDialogTitle, view:seafile_zimlet.pView, parent:seafile_zimlet.getShell(), standardButtons:[DwtDialog.DISMISS_BUTTON], extraButtons:[attachButton], disposeOnPopDown:true});
                    seafile_zimlet.pbDialog.setButtonListener(DwtDialog.DISMISS_BUTTON, new AjxListener(seafile_zimlet, seafile_zimlet._dismissBtnListener));
                    seafile_zimlet.pbDialog.setButtonListener(attachButtonId, new AjxListener(seafile_zimlet, seafile_zimlet._attachBtnListener));
                    
	            seafile_zimlet.pbDialog.popup(); //show the dialog
                    appCtxt.getAppController().setStatusMsg(sStatusMsg);
                    
                },
                error: function(xhr, textStatus, errorThrown) {
                    alert('List seafile libraries failed.');
                    console.log(xhr.responseText);
                }
            });

        }

};


/**
 * Creates the login dialog view.
 * 
 */
SeaFile.prototype._createDialogLoginView =
function() {
        var html = AjxTemplate.expand("com_zimbra_seafile.templates.Tab#LoginDlgTmpl");
	return html;
};

/**
 * The "login" button listener.
 * 
*/
SeaFile.prototype._loginBtnListener =
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
            seafile_zimlet.showSeaFileChooser();
        },
        error: function(xhr, textStatus, errorThrown) {
            alert('login failed.');
            console.log(xhr.responseText);
        }
    });
};

/**
 * The "attach" button listener.
 * 
*/
SeaFile.prototype._attachBtnListener =
function() {
    var seafile_zimlet = this;

    jQuery('.js-seafile-file:checked').each(function(idx, val) {
        var seafile_service_url = com_zimbra_seafile_HandlerObject.settings['seafile_service_url'];
        var repo_id = $(val).data('rid');
        var path = $(val).data('path');

        var seafile_share_link_url = seafile_service_url + '/api2/repos/' + repo_id + '/file/shared-link/';

        jQuery.ajax({           // get or create file shared link
            url: seafile_share_link_url,
            type: 'PUT',
            dataType: 'json',
            data: "p=" + path,
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", "Token " + readCookie("seafile_token"));
            },
            success: function(data, textStatus, jqXHR) {
                // get shared link from location header first,
                var shared_link = jqXHR.getResponseHeader('Location');
                if (!shared_link) {
                    // get shared link from response obj
                    var shared_link = data.shared_link;
                    if (!shared_link) {
                        alert('TODO: no shared link url found in response');
                        return false;
                    }
                }

                console.log('shared_link:' + shared_link);
                var composeView = appCtxt.getCurrentView();
                composeView.getHtmlEditor().setContent(composeView.getHtmlEditor().getContent()+"</br>"+path.substr(path.lastIndexOf('/') + 1)+"" +" : "+"<a href='"+shared_link+"'>"+shared_link+"</a>"+"</br>");

                seafile_zimlet.pbDialog.popdown();
            },
            error: function(xhr, textStatus, errorThrown) {
                alert('Get share link failed.');
                console.log('err');
                console.log(xhr);
                console.log(textStatus);
                console.log(errorThrown);
            }
        });

    });
}

/**
 * The "DISMISS" button listener.
 * 
*/
SeaFile.prototype._dismissBtnListener =
function() {
        this.pbDialog.popdown(); //hide the dialog

};

SeaFile.prototype.appActive =
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

SeaFile.prototype.appLaunch =
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

SeaFile.prototype._createTabView =
function() {
	return	AjxTemplate.expand("com_zimbra_seafile.templates.Tab#Main");		
};


