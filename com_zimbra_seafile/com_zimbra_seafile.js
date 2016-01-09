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
    console.log("|this| context in init: ");
    console.log(this);
    console.log('------------------');

    com_zimbra_seafile_HandlerObject.version=this._zimletContext.version;
    com_zimbra_seafile_HandlerObject.settings['seafile_service_url'] = this._zimletContext.getConfig("seafile_service_url");

    this._simpleAppName = this.createApp("SeaFile", "zimbraIcon", "Connect you SeaFile profile");
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


function listFiles(){

	var text = '{ "files" : [' +	
	'{ "name":"file1" , "share":"http://asd1.com" },' +
	'{ "name":"file2" , "share":"http://asd2.com" },' +
	'{ "name":"file3" , "share":"http://asd3.com" } ]}';

	var obj = JSON.parse(text);
/*
	$.ajax
	({
		type: "GET",
		url: "https://192.168.122.30:5050/api2/shared-links/",
		dataType: 'json',
		async: false,
		contentType: 'application/json',
		headers: {
		  "Authorization": "Token " + SeaFileToken,
		   'X-Auth-Token' :  "Token " + SeaFileToken,
		},
		success: function (success){
			data = success;
		    alert('Listeleniyor'); 
		},error: function(data){
			alert("Cannot get data > "+JSON.stringify(data));
		}

	});
*/
	return obj;

};


SeaFile.prototype.initializeAttachPopup =
function(menu, controller) {
	var mi = controller._createAttachMenuItem(menu, "SeaFile",
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
	    var data = listFiles();

	    this.pView = new DwtComposite(this.getShell()); //creates an empty div as a child of main shell div
	    this.pView.setSize("250", "150"); // set width and height
	    this.pView.getHtmlElement().style.overflow = "auto"; // adds scrollbar
	    this.pView.getHtmlElement().innerHTML = "<a href='#' class='AttLink' style='text-decoration:underline;' " +
		"onClick=\"SeaFile.saveShare('" + data.files[0].name + "','" + data.files[0].share + "')\">"+
		data.files[0].name +
		"</a>";

	    this.pbDialog = new ZmDialog({title:sDialogTitle, view:this.pView, parent:this.getShell(), standardButtons:[DwtDialog.DISMISS_BUTTON]});
	    this.pbDialog.setButtonListener(DwtDialog.DISMISS_BUTTON, new AjxListener(this, this._dismissBtnListener)); 
	    this.pbDialog.popup(); //show the dialog
            appCtxt.getAppController().setStatusMsg(sStatusMsg);
	}

};


SeaFile.saveShare = 
function(name,share){

/*
  var composeView = appCtxt.getCurrentView();   
  composeView.getHtmlEditor().setContent('');    
  
*/
  var composeView = appCtxt.getCurrentView();   
  composeView.getHtmlEditor().setContent(composeView.getHtmlEditor().getContent()+"</br>"+name+"" +" : "+"<a href='"+share+"'>"+share+"</a>"+"</br>");   

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


