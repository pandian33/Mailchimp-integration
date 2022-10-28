var simpleInMemoryDataStore = {
    mailchimpConf: {}
};

module.exports = {
    saveMailChimpForUser: function(email, mailchimpConf) {
        simpleInMemoryDataStore.mailchimpConf[email] = mailchimpConf;
    },
    getMailChimpForUser: function(email) {
        return simpleInMemoryDataStore.mailchimpConf[email];
    }
};