AjxTemplate.register("com_zimbra_seafile.templates.Tab#Main", 
function(name, params, data, buffer) {
	var _hasBuffer = Boolean(buffer);
	data = (typeof data == "string" ? { id: data } : data) || {};
	buffer = buffer || [];
	var i = buffer.length;

	buffer[i++] = "<form id='sea_login' ><DIV class='SForce_yellow' id='sforce_logindlg_errorDiv' style='display:none;color:red;font-weight:bold;'></DIV>";
	buffer[i++] = "<DIV>";
	buffer[i++] = "<TABLE class='SForce_table'  width='90%'><TR><TD style='font-weight:bold'>User Name:</TD><TD><INPUT type='text' name='names' id='sforce_logindlg_userNamefield' /></TD></TR>";
	buffer[i++] = "<TR><TD  style='font-weight:bold'>Password:</TD><TD><INPUT type='password' name='password' id='sforce_logindlg_passwordfield' /></TD></TR>";

	buffer[i++] = "</TABLE></DIV><BR/>";
	buffer[i++] = "<DIV>";
	buffer[i++] = "<TABLE class='SForce_table' width='100%'>";
	//buffer[i++] = "<TR><TD width=18px><INPUT type='checkbox' id='sforce_logindlg_sbarShowOnlyOnResult' /></TD><TD  style='font-weight:bold'>Show Salesforce Bar only when there are Salesforce contacts<TD></TD></TR>";
	buffer[i++] = "<INPUT type='submit' value='Login' onClick='SeaFile.login(this)' />";
	buffer[i++] = "</TABLE></DIV></form>";


	return _hasBuffer ? buffer.length : buffer.join("");
},
{
	"id": "Main"
}, false);
AjxTemplate.register("com_zimbra_seafile.templates.Tab", AjxTemplate.getTemplate("com_zimbra_seafile.templates.Tab#Main"), AjxTemplate.getParams("com_zimbra_seafile.templates.Tab#Main"));


