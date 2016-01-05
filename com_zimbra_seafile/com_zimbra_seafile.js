/* 
 *   Zimbra SeaFile
 *   Copyright (C) 2016 
 */

function com_zimbra_seafile_HandlerObject() {
}

var SeaFile = com_zimbra_seafile_HandlerObject;

/**
 * Makes the Zimlet class a subclass of ZmZimletBase.
 *
 */
SeaFile.prototype = new ZmZimletBase();
SeaFile.prototype.constructor = com_zimbra_seafile_HandlerObject;

/**
* This method gets called by the Zimlet framework when the zimlet loads.
*  
*/
SeaFile.prototype.init =
function() {

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


SeaFile.login = function(data){
	
	/*
		curl -d "username=username@example.com&password=123456" https://cloud.seafile.com/api2/auth-token/
		curl -d "username=ahmetkucuk4@gmail.com&password=123" http://192.168.122.30:8000/api2/auth-token/
	*/

	$( "#sea_login" ).submit(function( event ){

	  	//alert( $( this ).serialize()+"" 

	  	console.log("sea_login run");
	  	var user_name="";
	  	var password="";
	  	var token = "abcdef123456789";

	  	//alert( JSON.stringify($(this).serializeArray()) );
	 	event.preventDefault();

		jQuery.each($(this).serializeArray(), function(index, value) {
		       //console.log(" > " + this);
		       if(this.name+"" == "names"){
		       		user_name = this.value; 
		       		console.log("username:"+user_name);
		       }else if(this.name+"" == "password"){
					password = this.value; 
					console.log("password:"+password);
		       }
		});

		if(user_name == "ahmet" && password == "123"){
			//alert("Giris Basarili");
			console.log(" > Login success");
			createCookie('seafile_token',token,1);
			this._dismissBtnListener();
		}

		/*
		$.ajax({
			
			url:"https://192.168.122.30:5050/api2/auth-token/",
			type: 'POST',
			dataType:'json',
			data: data,	
			contentType: 'application/json',
			success: function (data) {
				appCtxt.cacheSet("SeaFileToken", data.token);
  				alert("Success Login >"+JSON.stringify(data));
			},error: function(data){
			    alert("Cannot get data > "+JSON.stringify(data));
			}
		});
		*/

	});

}

SeaFile.prototype.initializeAttachPopup =
function(menu, controller) {
	var mi = controller._createAttachMenuItem(menu, "SeaFile",
			new AjxListener(this, this.showSeaFileChooser));
};


SeaFile.prototype.showSeaFileChooser=
function() {

	var SeaFileToken = readCookie("seafile_token");
	console.log("Seafile Token Cookie > "+SeaFileToken);

	if (this.pbDialog) { //if zimlet dialog already exists...
		this.pbDialog.popup(); //simply popup the dialog
		return;
	}

	if(SeaFileToken == null)
	{

		var sDialogTitle = "SeaFile";
		var sStatusMsg = "Login";
		
		this.pView = new DwtComposite(this.getShell()); //creates an empty div as a child of main shell div
		this.pView.setSize("250", "150"); // set width and height
		this.pView.getHtmlElement().style.overflow = "auto"; // adds scrollbar
		this.pView.getHtmlElement().innerHTML = this._createDialogLoginView(); // insert html to the dialogbox

		// pass the title, view & buttons information to create dialog box
		this.pbDialog = new ZmDialog({title:sDialogTitle, view:this.pView, parent:this.getShell(), standardButtons:[DwtDialog.DISMISS_BUTTON]});
		this.pbDialog.setButtonListener(DwtDialog.DISMISS_BUTTON, new AjxListener(this, this._dismissBtnListener)); 
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


SeaFile.prototype._createDialogLoginView =
function() {
	var html = AjxTemplate.expand("com_zimbra_seafile.templates.Tab#Main");		
	return html;
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


