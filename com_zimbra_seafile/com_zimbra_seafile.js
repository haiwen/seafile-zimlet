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

// Utility functions
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

function HTMLescape(html) {
    return document.createElement('div')
        .appendChild(document.createTextNode(html))
        .parentNode
        .innerHTML;
}

function addShibSSOMsgListener(seafile_zimlet, funcOnSuccess) {
    // Listen to message from child window, for Shibboleth auth token.
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";
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
            console.log('remove #seafile-shib-ifrm');
            seafile_zimlet.pbDialog.popdown(); //hide the dialog
            console.log('close iframe dialog')

            var splits = JSON.parse(data).split('@');
            var seafile_token = splits[splits.length - 1];
            if (seafile_token && seafile_token.length == 40) {
                // set to cookie, and open file chooser
                createCookie('seafile_token', seafile_token, 1);
                seafile_zimlet[funcOnSuccess]();
            }
        }
    },false);
}

function seafileShibLogin(seafile_zimlet, funcOnSuccess) {
    seafile_zimlet.iframeView = new DwtComposite(appCtxt.getShell()); //creates an empty div as a child of main shell div
    seafile_zimlet.iframeView.setSize("600", "450"); // set width and height
    seafile_zimlet.iframeView.getHtmlElement().style.overflow = "auto"; // adds scrollbar

    var shib_login_src = com_zimbra_seafile_HandlerObject.settings['seafile_service_url'] + '/shib-login/?next=/shib-success/'; // todo: handle non-root seafile service

    $('<iframe>', {
        src: shib_login_src,
        id:  'seafile-shib-ifrm',
        sandbox: 'allow-same-origin allow-forms allow-scripts', // iframe sandbox trick http://www.html5rocks.com/en/tutorials/security/sandboxed-iframes/
        width: '600',
        height: '450'
    }).appendTo(seafile_zimlet.iframeView.getHtmlElement());
    console.log('append ifrm');
    
    // pass the title, view & buttons information to create dialog box
    seafile_zimlet.pbDialog = new ZmDialog({view:seafile_zimlet.iframeView, parent:appCtxt.getShell(), standardButtons:[DwtDialog.DISMISS_BUTTON]});

    seafile_zimlet.pbDialog.popup(); //show the dialog
}

////////////////////////////////////////////////////////////////////////////////

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
    console.log('seafile zimlet init');

    // add config values
    com_zimbra_seafile_HandlerObject.version=this._zimletContext.version;
    com_zimbra_seafile_HandlerObject.settings['seafile_service_url'] = this._zimletContext.getConfig("seafile_service_url");
    com_zimbra_seafile_HandlerObject.settings['zimbra_service_url'] = this._zimletContext.getConfig("zimbra_service_url");
    com_zimbra_seafile_HandlerObject.settings['shibboleth_login'] = this._zimletContext.getConfig("shibboleth_login");

    // save attachment to seafile
    if (appCtxt.get(ZmSetting.MAIL_ENABLED)) {
        AjxPackage.require({name:"MailCore", callback:new AjxCallback(this, this.addAttachmentHandler)});
    }

};

SeafileZimlet.prototype.status =
function(text, type, timeout) {
    var timeout = typeof timeout !== 'undefined' ?  timeout : 5;
    var transitions = [ ZmToast.FADE_IN ];

    var tmp_arr = Array.apply(null, Array(timeout-2));     // remove first and last second
    var pauses = tmp_arr.map(function (x) { return ZmToast.PAUSE });
    transitions = transitions.concat(pauses);

    transitions.push(ZmToast.FADE_OUT);
    appCtxt.getAppController().setStatusMsg(text, type, null, transitions);

    appCtxt.getAppController().statusView.nextStatus();
}; 

SeafileZimlet.prototype.addAuthToken = function(request) {
    request.setRequestHeader("Authorization", "Token " + readCookie("seafile_token"));
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

////////////////////////////// Attach Seafile links to mail //////////////////////////////

SeafileZimlet.prototype.initializeAttachPopup =
function(menu, controller) {
        var mi = controller._createAttachMenuItem(menu, "Seafile",
                        new AjxListener(this, this.showSeafileChooser));
};

SeafileZimlet.prototype.showSeafileChooser=
function() {
    var SeafileToken = readCookie("seafile_token");
    var seafile_zimlet = this;

    if (SeafileToken == null) {
        if (com_zimbra_seafile_HandlerObject.settings['shibboleth_login'] == 'true') {
            addShibSSOMsgListener(seafile_zimlet, 'showSeafileChooser');
            seafileShibLogin(seafile_zimlet, 'showSeafileChooser');
        } else {
            seafile_zimlet._showSeafileLoginDialog('showSeafileChooser');
        }

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
            beforeSend: SeafileZimlet.prototype.addAuthToken,
            success: function(data) {
                var repos = FileTree.formatRepoData(data);
                FileTree.renderFileTree($fileTreeContainer, repos, {
                    beforeSend: SeafileZimlet.prototype.addAuthToken,
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

SeafileZimlet.prototype._showSeafileLoginDialog =
function(loginSuccessFunc) {
    var sDialogTitle = "Login to Seafile";
    
    this.pView = new DwtComposite(appCtxt.getShell()); //creates an empty div as a child of main shell div
    this.pView.getHtmlElement().innerHTML = this._createDialogLoginView(); // insert html to the dialogbox

    var loginButtonId = Dwt.getNextId();
    var loginButton = new DwtDialog_ButtonDescriptor(
        loginButtonId, "Login", DwtDialog.ALIGN_CENTER);

    var dialog_args = {
        title	: sDialogTitle,
        view	: this.pView,
        parent	: appCtxt.getShell(),
        standardButtons : [DwtDialog.CANCEL_BUTTON],
        extraButtons : [loginButton]
    }

    // pass the title, view & buttons information to create dialog box
    this.pbDialog = new ZmDialog(dialog_args);
    this.pbDialog.setButtonListener(DwtDialog.CANCEL_BUTTON, new AjxListener(this, this._cancelBtnListener));
    this.pbDialog.setButtonListener(loginButtonId, new AjxListener(this, this._loginBtnListener, [loginSuccessFunc]));

    this.pbDialog.popup(); //show the dialog
}


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
function(loginSuccessFunc) {
    var user_name="";
    var password="";
    var token = "";
    var seafile_service_url = com_zimbra_seafile_HandlerObject.settings['seafile_service_url'];
    var seafile_token_url = seafile_service_url + '/api2/auth-token/';
    var seafile_zimlet = this;

    username = jQuery.trim(jQuery('#seafile_login_dlg_username').val());
    password = jQuery.trim(jQuery('#seafile_login_dlg_password').val());

    console.log(" >> username : "+username);
    console.log(" >> password : "+password);
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
            if (loginSuccessFunc) {
                seafile_zimlet[loginSuccessFunc]();
            }
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
            beforeSend: SeafileZimlet.prototype.addAuthToken,
            success: function(data, textStatus, jqXHR) {
                // at present(Thu Jan 21 11:38:42 CST 2016), the returned shared_link(url) is stored in header 'Location'
                var shared_link = jqXHR.getResponseHeader('Location');

                var composeView = appCtxt.getCurrentView();
                var filename = HTMLescape(path.substr(path.lastIndexOf('/') + 1));
                var zimbra_service_url = com_zimbra_seafile_HandlerObject.settings['zimbra_service_url'];
                var attached_item = '<div style="width:180px; padding:5px 10px; border:1px solid #ddd; background:#f8f8f8; margin:10px 0;">' + '<img src="' + zimbra_service_url + seafile_file_icon.getFileIconUrl(filename) + '" alt="File icon" width="80" />' + '<a href="' + shared_link + '" style="display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-decoration:none;" title="' + filename + '">' + filename + '</a></div>';
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

////////////////////////////// Save attachment to Seafile //////////////////////////////

/**
* This method adds handler for save Attachment to Seafile
*
*/
SeafileZimlet.prototype.addAttachmentHandler = function(mime)
{
    console.log('add attachment link');
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
        "onClick=\"SeafileZimlet.prototype.showAttachementSaveDlg('" + attachment.label + "','" + attachment.url + "')\">"+
        "Seafile" +
        "</a>";
    return html;
};

/**
* This method list seafile libraries and show saves Attachment dialog.
*
*/
SeafileZimlet.prototype.showAttachementSaveDlg = 
function(name,url){
    var SeafileToken = readCookie("seafile_token");
    var seafile_zimlet = this;

    if (SeafileToken == null) {
        if (com_zimbra_seafile_HandlerObject.settings['shibboleth_login'] == 'true') {
            addShibSSOMsgListener(seafile_zimlet, 'showAttachementSaveDlg');
            seafileShibLogin(seafile_zimlet, 'showAttachementSaveDlg');
        } else {
            seafile_zimlet._showSeafileLoginDialog('showAttachementSaveDlg');
        }

    } else { // show 'attach file' popup
    
        seafile_zimlet.status('Loading...', ZmStatusView.LEVEL_INFO);

        var sDialogTitle = "Save attachment to:";
        var seafile_service_url = com_zimbra_seafile_HandlerObject.settings['seafile_service_url'];
        var seafile_libraries_url = seafile_service_url + '/api2/repos/';

        seafile_zimlet.pView = new DwtComposite(appCtxt.getShell()); //creates an empty div as a child of main shell div
        seafile_zimlet.pView.setSize("400px", "300px"); // set width and height
        seafile_zimlet.pView.getHtmlElement().style.overflow = "auto"; // adds scrollbar

        var $fileTreeContainer = $(seafile_zimlet.pView.getHtmlElement());

        var attachButtonId = Dwt.getNextId();
        var attachButton = new DwtDialog_ButtonDescriptor(
            attachButtonId, "Save", DwtDialog.ALIGN_RIGHT);

        seafile_zimlet.pbDialog = new ZmDialog({
            title: sDialogTitle,
            view: seafile_zimlet.pView,
            parent: appCtxt.getShell(),
            standardButtons: [DwtDialog.CANCEL_BUTTON],
            extraButtons: [attachButton],
            disposeOnPopDown:true
        });
        seafile_zimlet.pbDialog.setButtonListener(DwtDialog.CANCEL_BUTTON, new AjxListener(seafile_zimlet, seafile_zimlet._cancelBtnListener));
        seafile_zimlet.pbDialog.setButtonListener(attachButtonId, new AjxListener(seafile_zimlet, seafile_zimlet._saveBtnListener, [name, url]));

        var seafile_service_url = com_zimbra_seafile_HandlerObject.settings['seafile_service_url'];
        var seafile_libraries_url = seafile_service_url + '/api2/repos/?type=mine';
        jQuery.ajax({
            url: seafile_libraries_url,
            type: 'GET',
            dataType: 'json',
            beforeSend: SeafileZimlet.prototype.addAuthToken,
            success: function(data) {
                seafile_zimlet.status('Success', ZmStatusView.LEVEL_INFO);

                var repos = FileTree.formatRepoData(data);
                FileTree.renderDirTree($fileTreeContainer, repos, {
                    beforeSend: SeafileZimlet.prototype.addAuthToken,
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
}

/**
* This method uploads attachement to Seafile.
*
*/
SeafileZimlet.prototype._saveBtnListener =
function(file_name, file_url) {
    var seafile_zimlet = this;

    var $fileTreeContainer = $(seafile_zimlet.pView.getHtmlElement());
    var $parent = $('.jstree-clicked', $fileTreeContainer).parents('[root_node=true]');
    var path = $parent.attr('path');
    var repo_id = $parent.attr('repo_id');

    var seafile_uploads_url = com_zimbra_seafile_HandlerObject.settings['seafile_service_url'] + '/api2/repos/' + repo_id + '/upload-link/';

    seafile_zimlet.status('Fetching upload url...', ZmStatusView.LEVEL_INFO);
    $.ajax({
        url: seafile_uploads_url,
        type: 'GET',
        dataType: 'json',
        beforeSend: SeafileZimlet.prototype.addAuthToken,
        success: function(data) {
            seafile_zimlet.status('Fetching attachment...', ZmStatusView.LEVEL_INFO);

            var seafile_uploads_url_post = data;

            var xmlHttp = null;   
            xmlHttp = new XMLHttpRequest();
            xmlHttp.open( "GET", file_url, true );
            xmlHttp.responseType = "blob";
            xmlHttp.send( null );

            xmlHttp.onload = function(e) {
                seafile_zimlet.pbDialog.popdown(); // close the dialog
                seafile_zimlet.status('Saving to Seafile...', ZmStatusView.LEVEL_INFO);

                var fd = new FormData();
                fd.append('filename', file_name);
                fd.append('file', xmlHttp.response, file_name);
                fd.append('parent_dir',path);

                $.ajax({
                    url: seafile_uploads_url_post,
                    type: 'POST',

                    dataType: 'html', // specify as plain text, otherwise jquery will raise JSON parse error
                    processData: false,
                    contentType: false,
                    data: fd,
                    beforeSend: SeafileZimlet.prototype.addAuthToken,
                    success: function(data) {
                        seafile_zimlet.status('Upload success', ZmStatusView.LEVEL_INFO);
                    },
                    error: function(response) {
                        console.log(response);
                        seafile_zimlet.status('Upload error', ZmStatusView.LEVEL_WARNING);
                    }
                });
            };

        },
        error: function(xhr, textStatus, errorThrown) {
            console.log('err:' + xhr.responseText);
        }
    });
}

