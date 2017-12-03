/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
//var azure = require('botbuilder-azure');

// Setup Restify Server
var server = restify.createServer();
// server.use(restify.queryParser());  

server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    stateEndpoint: process.env.BotStateEndpoint,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */
// var tableClient = new azure.AzureTableClient('RecentNotifications', 'recentnotifications', 'gYlzP+BVBQZgUIliiZHq+fSmZT42FLlUDl4S1g/HzE4ImrMhT5y6DhlGPBJfxCmetiUqw5SSEdk3Mcoh435Nxg==');
// var tableStorage = new azure.AzureBotStorage({ gzipData: false }, tableClient);

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot (connector, function (session) {
    var message = session.message;
    var source = message.source;
    var userId;
        
    console.log('--- Version: 0.6 ---');
    console.log(JSON.stringify(message, null, 4));
    console.log('Source: ' + source);
    console.log('Text: ' + message.text);
    
    if (message.source == 'directline') {
        // Store notification msg from Android app
        userId = message.address.user.id;
        console.log('Id: [' + userId + ']');
        session.userData.lastMsg = message.text;
        // session.userData.notifications = {};
        // session.userData.notifications[userId] = message.text; // TODO - Replace in production
        // console.log('userData: ' +  Object.keys(session.userData.notifications).length);
    } else {
        for (var i = 0; i < message.entities.length; i++) {
            var entity = message.entities[i];
            if ('email' in entity) {
                userId = entity.email; // email as identity
                console.log('Email: ' + entity.email);
                console.log('Name: ' + entity.name.GivenName + ' ' + entity.name.FamilyName); 
                break;
            }
        }
        console.log('Id: [' + userId + ']');
        // console.log('userData: ' +  Object.keys(session.userData.notifications).length);
        // var lastNotification = session.userData.notifications ? session.userData.notifications[userId] : null;
        var lastNotification = session.userData.lastMsg;
        var msg = 'No recent notifications';
        if (lastNotification && lastNotification.length > 0) { 
            msg = "Your last notification was, " + lastNotification;
        } 
        console.log('Msg: ' + msg);  
        session.say(msg, msg);  
    }
});

//}).set('storage', tableStorage);

// server.get("/api/oauthcallback", function (req, res, next) {  
//     console.log("OAUTH CALLBACK");  
//     var authCode = req.query.code,  
//     address = JSON.parse(req.query.state),  
//     oauth = getOAuthClient();  
    
//     oauth.getToken(authCode, function (err, tokens) {  
//         if (!err) {  
//             bot.beginDialog(address, "/oauth-success", tokens);  
//         }  
//         res.send(200, {});  
//     });  
// });  