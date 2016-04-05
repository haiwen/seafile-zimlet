/**
 * @license
 * Zimbra Seafile Zimlet
 *
 * Copyright 2016 Deltanoc Ltd.
 * Copyright 2016 Seafile Ltd. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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


    var seafile_zimlet = this;
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";
    // Listen to message from child window
    eventer(messageEvent,function(e) {
        var tmp_anchor = $("<a />");
        tmp_anchor.attr('href', com_zimbra_seafile_HandlerObject.settings['seafile_service_url']);

        if (e.origin != tmp_anchor[0].protocol + '//' + tmp_anchor[0].hostname) {
            console.log("Bad origin: " + e.origin);
            return;
        }

        var key = e.message ? "message" : "data";
        var data = e[key];
        if (data) {
            // data format: "test.seafile@mail.fr@xxxxxxxxxxxxxxxxxx"
            console.log(data);

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

    var SeafileToken = readCookie("seafile_token");
    if (appCtxt.get(ZmSetting.MAIL_ENABLED) && SeafileToken != null) {
        AjxPackage.require({name:"MailCore", callback:new AjxCallback(this, this.addAttachmentHandler)});
    }

};

/**
* This method adds handler for save Attachment to Seafile
*
*/
SeafileZimlet.prototype.addAttachmentHandler = function(mime)
{
    this._msgController = AjxDispatcher.run("GetMsgController");
    var viewType = appCtxt.getViewTypeFromId(ZmId.VIEW_MSG);
    this._msgController._initializeView(viewType);

    //Load 1000 mime-types
    SeafileZimlet.prototype.mime();
    SeafileZimlet.mime.forEach(function(mime) 
    {
        var MISSMIME = 'SeafileZimlet'+mime.replace("/","_");
        ZmMimeTable.MISSMIME=mime;
        ZmMimeTable._table[ZmMimeTable.MISSMIME]={desc:ZmMsg.unknownBinaryType,image:"UnknownDoc",imageLarge:"UnknownDoc_48"};
    });

    for (var mimeType in ZmMimeTable._table) {
        this._msgController._listView[viewType].addAttachmentLinkHandler(mimeType,"Seafile",this.addSeafileLink);
    }
};

/**
* This method adds button for save Attachment to Seafile
*
*/
SeafileZimlet.prototype.addSeafileLink = 
function(attachment) {
    var html =
        "<a href='#' class='AttLink' style='text-decoration:underline;' " +
        "onClick=\"SeafileZimlet.prototype.saveAttachment('" + attachment.label + "','" + attachment.url + "')\">"+
        "Seafile" +
        "</a>";
    return html;
};

/**
* This method saves Attachment to Seafile
*
*/
SeafileZimlet.prototype.saveAttachment = 
function(name,url){

    var seafile_service_url = com_zimbra_seafile_HandlerObject.settings['seafile_service_url'];
    var seafile_libraries_url = seafile_service_url + '/api2/repos/';
    var seafile_zimlet = this;
    var msg = "<h3>Select your lib.</h3></br>";

    jQuery.ajax({ // list libraries
        url: seafile_libraries_url,
        type: 'GET',
        dataType: 'json',

        beforeSend: function (request) {
            request.setRequestHeader("Authorization", "Token " + readCookie("seafile_token"));
        },

        success: function(data){
            jQuery.each(data, function(idx, val) {
                if (val.type == 'repo') {
                    // only list owned repos
                    msg += "<div><span><img src=\"/service/zimlet/_dev/com_zimbra_seafile/lib.png\"><a href='#' class='js-seafile-lib' data-rid='" + val.id + "' style='text-decoration:underline;' >" + val.name + "</a></span></div>";
                }
            });

            this._dialog =  null;
            var style = DwtMessageDialog.INFO_STYLE; //show info status by default

            var sDialogTitle = "Seafile";
            var sStatusMsg = "Login";
            this._dialog = appCtxt.getMsgDialog(); // returns DwtMessageDialog

            // set the button close
            this._dialog.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, SeafileZimlet.prototype._okBtnListener));       

            this._dialog.reset(); // reset dialog
            this._dialog.setMessage(msg, style);
            this._dialog.popup();


            jQuery('.js-seafile-lib').click(function() {
                var repo_id = jQuery(this).data('rid');
                var seafile_uploads_url = seafile_service_url + '/api2/repos/' + repo_id + '/upload-link/';

                var xmlHttp = null;   
                xmlHttp = new XMLHttpRequest();
                xmlHttp.open( "GET", url, true );        
                xmlHttp.responseType = "blob";
                xmlHttp.send( null );

                jQuery.ajax({ 
                    url: seafile_uploads_url,
                    type: 'GET',
                    dataType: 'json',
                    beforeSend: function (request) {
                        request.setRequestHeader("Authorization", "Token " + readCookie("seafile_token"));
                    },
                    success: function(data) {

                        var seafile_upload_url_post = data;
                        // Below code added to fix http-https mixed content error
                        seafile_upload_url_post = seafile_upload_url_post.replace("http","https").replace("8082","8182");
                        var fd = new FormData();
                        fd.append('filename', name);
                        fd.append('file', xmlHttp.response, name);
                        fd.append('parent_dir','/');

                        jQuery.ajax({
                            url: seafile_upload_url_post, 
                            type: 'POST',
                            processData: false,
                            contentType: false,
                            data: fd,
                            beforeSend: function (request) {
                                request.setRequestHeader("Authorization", "Token " + readCookie("seafile_token"));
                            },
                            success: function(data) {
                                console.log("UPLOAD SUCCESS");
                            },
                            error: function(response) {
                                alert('Unexpected Error');
                                console.log("Hata : "+JSON.stringify(response));
                            }
                        });
                    },
                    error: function(xhr, textStatus, errorThrown) {
                        alert('List seafile dir failed.');
                        console.log(xhr.responseText);
                    }
                });

            });
        },
            error: function(xhr, textStatus, errorThrown) {
                alert('List seafile libraries failed.');
                console.log(xhr.responseText);
            }
        });
}

SeafileZimlet.prototype._okBtnListener = 
function(obj) {
    this._dialog.popdown(); // close the dialog
>>>>>>> 9ce97876a70748e1f85644421affde5c37e5e3aa
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

    // remove first and last two seconds
    var tmp_arr = Array.apply(null, Array(timeout-2));
    var pauses = tmp_arr.map(function (x) { return ZmToast.PAUSE });
    transitions = transitions.concat(pauses);

    transitions.push(ZmToast.FADE_OUT);
    appCtxt.getAppController().setStatusMsg(text, type, null, transitions);

    appCtxt.getAppController().statusView.nextStatus();
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
        loginButtonId, "Login", DwtDialog.ALIGN_CENTER);

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
        seafile_zimlet.status('Success', ZmStatusView.LEVEL_INFO);

        var sDialogTitle = "Attach file(s) from Seafile";
        var seafile_service_url = com_zimbra_seafile_HandlerObject.settings['seafile_service_url'];
        var seafile_libraries_url = seafile_service_url + '/api2/repos/';
        var seafile_zimlet = this;

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

    console.log(" >> username : "+username);
    console.log(" >> password : "+username);
    console.log(" >> url      : "+seafile_token_url);

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
                var attached_item = '<div style="width:180px; padding:5px 10px; border:1px solid #ddd; background:#f8f8f8; margin:10px 0;">' + '<img src="' + seafile_file_icon.getFileIconUrl(filename) + '" alt="File icon" width="80" />' + '<a href="' + shared_link + '" style="display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-decoration:none;" title="' + filename + '">' + filename + '</a></div>';
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
 * @param    {String}    appName        the application name        
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
 * @return    {String}    the tab HTML content
 */

SeafileZimlet.prototype._createTabView =
function() {
    return    AjxTemplate.expand("com_zimbra_seafile.templates.Tab#Main");        
};
