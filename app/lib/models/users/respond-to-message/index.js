var findTasks = require('../../tasks');
var _ = require('lodash');

module.exports = function (message, res) {
  var user = this;
  var taskTemplate = _.template('<%= _id %>: <%= description %> (@ <%= location %>)');
  message = message.trim().toUpperCase();
  
  function send(reply) { user.message(reply, res); }
  function handleError() { send('I\'m sorry. Something went wrong.'); }
  function reset() {
    return user.destroy(function () {
      send('Resetting...');
    });
  }
  
  // TODO: Refactor this out into smaller functions/modules
  
  if (message === 'RESET') { return reset(); }
  
  if (!user.status) {
    return user.set('status', 'waitingOnZipCode', function (err) {
      if (err) handleError();
      send('Welcome! What zip code are you in?');
    });
  }
  
  if (user.status === 'waitingOnZipCode') {
    var zip = message.match(/\d{5}/) && message.match(/\d{5}/)[0];
    
    if (zip) {
      return findTasks.getAll(function (err, tasks) {
        if (err) console.log(err);
        var resources;
         
        tasks = _(Array.prototype.slice.call(tasks)).map(function (task) {
            return task.value;
          }).filter(function (task) {
            return task.zip === zip;
          }).value();
         
        resources = _(tasks).map(function (task) {
          return task.resources;
        }).flatten().union().value();
         
        if (resources.length) {
          return user.set({
            resourcesNeeded: resources,
            zip: zip,
            tasks: tasks,
            status: 'waitingOnResource'
          }, function (err) {
            if (err) handleError();
            send('Oh, great. We need the following resources in ' + zip + ': ' + resources.join(', '));
          });
        } else {
          send('We don\'t seem to need anything in ' + zip + '. Let\'s RESET and you can try again with like 11694 or something.');
          return reset();
        }
      });
    } else {
      return send('Hmm. That doesn\'t seem to be a valid zip code. Could you try that again?');
    }
  }
  
  if (user.status === 'waitingOnResource') {
    var replies;
    if (user.resourcesNeeded.indexOf(message) === -1) {
      replies = [
        message + ' is not something we need right now, but thank you!',
        'Please select from: ' + user.resourcesNeeded.join(', ') + '.'
      ];
      return send(replies);
    }
    
    var tasks = _.filter(user.tasks, function (task) {
      return task.resources.indexOf(message) !== -1;
    });
    
    return user.set({ status: 'waitingOnTaskSelection', tasks: tasks }, function () {
      replies = ['We need your help with the following:'];
      tasks.forEach(function (task) {
        replies.push(taskTemplate(task));
      });
      replies.push('Pick a number from the list above.');
      send(replies);
    });
  }
  
  if (user.status === 'waitingOnTaskSelection') {
    var selection = message.match(/\d+/) && message.match(/\d+/)[0];
    var validTaskIDs = user.tasks.map(function (task) {
      return task._id;
    });
    
    if (validTaskIDs.indexOf(selection) !== -1) {
      var selectedTask = user.tasks[validTaskIDs.indexOf(selection)];
      return user.set({ status: 'waitingOnConfirmation', task: selectedTask }, function (err) {
        if (err) handleError();
        var replies = [
          'You\'ve selected - ' + taskTemplate(selectedTask),
          'Is that right? CONFIRM or DENY'
        ];
        send(replies);
      });
    } else {
      replies = [];
      replies.push('That doesn\'t seem to be an option. Try again.');
      user.tasks.forEach(function (task) {
        replies.push(taskTemplate(task));
      });
      replies.push('Pick a number from the list above.');
      return send(replies);
    }
  }
  
  if (user.status === 'waitingOnConfirmation') {
    if (message === 'CONFIRM') {
      return user.set('status', 'confirmed', function (err) {
        if (err) handleError();
        return send('Alright, you\'re confirmed.');
      });
    }
    
    if (message === 'DENY') {
      return user.set('status', 'waitingOnTaskSelection', function () {
        var replies = ['Okay, let\'s try this again. We need your help with the following:'];
        tasks.forEach(function (task) {
          replies.push(taskTemplate(task));
        });
        replies.push('Pick a number from the list above.');
        return send(replies);
      });
    }
    
    // Fallback if all else fails.
    
    replies = [
      'Sorry, can you try again?',
      taskTemplate(user.task),
      'CONFIRM OR DENY'
    ];
    return send(replies);
  }
  
  if (user.status === 'confirmed') {
    replies = [
      'We\'ve got you confimed for:',
      taskTemplate(user.task),
      'You can type RESET to start over.'
    ];
    return send(replies);
  }
    
  return send(user.status + ': Not implemented yet.');
  
};