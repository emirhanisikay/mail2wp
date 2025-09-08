const { v4: uuidv4 } = require('uuid');

let state = {
    isServiceActive: true,
    emailQueue: [],
    startTime: Math.floor(Date.now() / 1000)
};

function addEmailToQueue(email) {
    const emailWithId = {
        ...email,
        id: uuidv4(),
        receivedAt: new Date().toLocaleString()
    };
    state.emailQueue.push(emailWithId);
}

module.exports = {
    ...state,
    addEmailToQueue
};