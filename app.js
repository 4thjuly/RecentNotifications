// Globals
const MAX_INDEX = 10;
const TABLE_NAME = "RecentNotifications1"; 
const STORAGE_NAME = "recentnotifications"; 
const STORAGE_KEY = "gYlzP+BVBQZgUIliiZHq+fSmZT42FLlUDl4S1g/HzE4ImrMhT5y6DhlGPBJfxCmetiUqw5SSEdk3Mcoh435Nxg==";

var restify = require('restify');
var builder = require('botbuilder');
var azureStorage = require('azure-storage');
var azureBotBuilder = require('botbuilder-azure'); 

// Setup Restify Server
var _server = restify.createServer();

// Storage
var _entGen = azureStorage.TableUtilities.entityGenerator;
var _tableSvc = azureStorage.createTableService(STORAGE_NAME, STORAGE_KEY);
_tableSvc.createTableIfNotExists(TABLE_NAME, function(error, result, response) {
    if (error) { console.error('ERROR: failed to create table'); }
    else { console.info('createTableIfNotExists: created'); }
});

// State
var _botTableClient = new azureBotBuilder.AzureTableClient('BotState', STORAGE_NAME, STORAGE_KEY);
var _botStorage = new azureBotBuilder.AzureBotStorage({gzipData: false}, _botTableClient);

/* global process */
_server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.info('%s listening to %s', _server.name, _server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var _connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    stateEndpoint: process.env.BotStateEndpoint,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
_server.post('/api/messages', _connector.listen());

// Create your bot with a function to receive messages from the user
var _bot = new builder.UniversalBot (_connector, function (session) {
    var message = session.message;
    var source = message.source;
    var userId;
        
    console.warn('\r--- Version: 0.6 ---');
    //console.log(JSON.stringify(message, null, 4));
    console.warn('Source: ' + source);
    console.info('Text: ' + message.text);
    
    if (message.source == 'directline') {
        addNotificationAsync(message.address.user.id, message.text);
    } else {
        var msg = 'No recent notifications';
        var userId = userIdFromMessage(message);
        getLastNotificationAsync(userId, function(notification) { 
            if (notification) {
                msg = "Your last notification was, " + notification;
            }
            console.log('Msg: ' + msg);  
            session.say(msg, msg);
        });             
    }
}).set('storage', _botStorage);

function userIdFromMessage(message) { 
    var userId = null;
    for (var i = 0; i < message.entities.length; i++) {
        var entity = message.entities[i];
        if ('email' in entity) {
            userId = entity.email; // email as identity
            console.log('Email: ' + entity.email);
            console.log('Name: ' + entity.name.GivenName + ' ' + entity.name.FamilyName); 
            break;
        }
    }
    return userId;
}

// NB Reentrancy will mean notification will get overwritten
function addNotificationAsync(userId, notification) {
    
    if (!userId) {
        console.log('ERROR: No user id');
        return;
    }
    
    // console.log('Id: [' + userId + ']');
    console.warn('addNotificationAsync: ', notification); 
        
    _tableSvc.retrieveEntity(TABLE_NAME, userId, 'currentIndex', function(error, result, response) {
        var currentIndex = 0;
        if (error) {
            console.warn('No current index, assuming 0');           
        } else {
            currentIndex = result.index._;
            if (++currentIndex > MAX_INDEX) currentIndex = 0;     
            console.info('NewIndex: ', currentIndex);        
        }
        
        // Write item then update index. 
        var notificationEntity = { PartitionKey: _entGen.String(userId), RowKey: _entGen.String(currentIndex.toString()), notification: _entGen.String(notification)};
        _tableSvc.insertOrReplaceEntity(TABLE_NAME, notificationEntity, function (error, result, response) {
            if (!error) {
                console.info('insertOrReplaceEntity: updated entity');
                var indexEntity = { PartitionKey: _entGen.String(userId), RowKey: _entGen.String('currentIndex'), index: _entGen.String(currentIndex.toString()), };
                _tableSvc.insertOrReplaceEntity(TABLE_NAME, indexEntity, function (error, result, response) {
                    if (!error) { console.info('insertOrReplaceEntity: updated index'); }
                    else { console.error('ERROR: failed to update index'); }
                });
            } else { 
                console.error('ERROR: failed to insert entity: ', error);
            }
        });                         
    });   
}

function getLastNotificationAsync(userId, successCallback) {
    if (!userId) {
        console.error('ERROR: No user id');
        return;
    }
    
    //console.log('Id: [' + userId + ']');
    console.warn('getLastNotificationAsync: ', userId);  
        
    _tableSvc.retrieveEntity(TABLE_NAME, userId, 'currentIndex', function(error, result, response) {
        if (!error) {  
            var currentIndex = result.index._;
            _tableSvc.retrieveEntity(TABLE_NAME, userId, currentIndex, function(error, result, response) {
                if (!error) { 
                    //console.log('Result: ' + JSON.stringify(result, null, 4));  
                    successCallback(result.notification._); 
                }
                else { 
                    console.warn('No previous notification'); 
                }
            });     
        } else {
            console.warn('No current index, no notifications yet \r', error); 
        }      
    });  

}