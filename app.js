var restify = require('restify');
var builder = require('botbuilder');
var azureStorage = require('azure-storage');
var azureBotBuilder = require('botbuilder-azure'); 

// Setup Restify Server
var server = restify.createServer();

// Storage
var tableName = "RecentNotifications1"; 
var storageName = "recentnotifications"; 
var storageKey = "gYlzP+BVBQZgUIliiZHq+fSmZT42FLlUDl4S1g/HzE4ImrMhT5y6DhlGPBJfxCmetiUqw5SSEdk3Mcoh435Nxg=="; // Obtain from Azure Portal
var tableSvc = azureStorage.createTableService(storageName, storageKey);
tableSvc.createTableIfNotExists(tableName, function(error, result, response){
  if (error) { console.log('ERROR: failed to create table'); }
  else {
      console.log('createTableIfNotExists: created'); 
  }
});

// State
var botTableClient = new azureBotBuilder.AzureTableClient('BotState', storageName, storageKey);
var botStorage = new azureBotBuilder.AzureBotStorage({gzipData: false}, botTableClient);

/* global process */
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

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot (connector, function (session) {
    var message = session.message;
    var source = message.source;
    var userId;
        
    console.log('--- Version: 0.6 ---');
    //console.log(JSON.stringify(message, null, 4));
    console.log('Source: ' + source);
    console.log('Text: ' + message.text);
    
    if (message.source == 'directline') {
        // Store notification msg from Android app
        userId = message.address.user.id;
        console.log('Id: [' + userId + ']');
        
        var entGen = azureStorage.TableUtilities.entityGenerator;
        var notificationEntity = {
            PartitionKey: entGen.String(userId),
            RowKey: entGen.String('1'),
            notification: entGen.String(message.text),
        };
        tableSvc.insertOrReplaceEntity(tableName, notificationEntity, function (error, result, response) {
            if (!error) {
                console.log('insertEntity: stored');
            } else { console.log('ERROR: failed to insert entity: ', error); }
        });
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
        tableSvc.retrieveEntity(tableName, userId, '1', function(error, result, response) {
            if (!error) { 
                //console.log('Result: ' + JSON.stringify(result, null, 4));  
                var lastNotification = result.notification._; 
                var msg = 'No recent notifications';
                if (lastNotification && lastNotification.length > 0) { 
                    msg = "Your last notification was, " + lastNotification;
                } 
                console.log('Msg: ' + msg);  
                session.say(msg, msg); 
            }
            else { console.log('retrieveEntity: No previous notification'); }
        });  
    }
}).set('storage', botStorage);
