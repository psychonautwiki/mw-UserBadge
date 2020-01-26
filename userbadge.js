class UserBadges {
    constructor() {
        this._userEndpoint = 'https://psychonautwiki.global.ssl.fastly.net/w/api.php?action=query&list=allusers&auprop=groups&augroup=bureaucrat|sysop|scholar|donor&aulimit=100&format=json';

        this._userMapping = {
            /*userName: bureaucrat|sysop|scholar*/
        };

        this._levelDisplayText = {
            medium: 'System Operator',
            admin: 'Administrator',
            sentinel: 'Moderator',
            scholar: 'Scholar',
            donor: 'Donor'
        };

        this._retrieveUsers();
    }

    _ingestError (err) {
        if ('Raven' in window && 'captureException' in window['Raven']) {
            /* send to sentry */
            window['Raven']['captureException'](err);
        }
    }

    _retrieveUsers () {
        try {
            const xhr = new XMLHttpRequest();

            const self = this;

            xhr.addEventListener('load', function () {
                try {
                    self._processUsers(JSON.parse(this.responseText));
                } catch(e) {
                    self._ingestError(e);
                }
            });

            xhr.open('GET', this._userEndpoint);

            xhr.send();
        } catch(e) {
            this._ingestError(e);
        }
    }

    _getGroupFromUser(user) {
        if (user['groups'].indexOf('medium') !== -1) {
            return 'medium';
        }

        if (user['groups'].indexOf('admin') !== -1) {
            return 'admin';
        }

        if (user['groups'].indexOf('sentinel') !== -1) {
            return 'sentinel';
        }

        if (user['groups'].indexOf('scholar') !== -1) {
            return 'scholar';
        }

        if (user['groups'].indexOf('donor') !== -1) {
            return 'donor';
        }
    }

    _processUsers(userData) {
        const users = userData['query']['allusers'];

        users.forEach(user => {
            this._userMapping[user['name']] = this._getGroupFromUser(user);
        });

        this._rewriteUserLinks();
        this._addUserLevelToProfile();
    }

    _addUserLevelToProfile() {
        const pageName = window['mw']['config']['get']('wgPageName');

        const userName = pageName && /^User:(.*?)$/.exec(pageName);

        if (!userName || !userName[1]) {
            return;
        }

        const profileUserLevel = this._userMapping[userName[1]];
        const levelDisplayText = this._levelDisplayText[profileUserLevel];

        const actionsContainer = document.getElementsByClassName('profile-actions')[0];

        if (profileUserLevel && levelDisplayText && actionsContainer) {
            const prevActions = actionsContainer.innerHTML;

            const profileLevelClass = `profile-special profile-${profileUserLevel}`;

            actionsContainer.innerHTML =
                `<div class='${profileLevelClass}'>
                    ${levelDisplayText}
                </div> | ${prevActions}`;
        }
    }

    _rewriteUserLinks() {
        Array.prototype.slice.call(document.getElementsByTagName('a')).forEach(item =>
            this._doUserRewriteForElement(item)
        );
    }

    _itemAddClassIfNeeded(item, newClass) {
        if (item.className.indexOf(newClass) === -1) {
            item.className = [item.className, newClass].join(' ');
        }
    }

    _doUserRewriteForElement(item){
        // Is the first child an image? bail.
        if (item['firstChild'] instanceof (window['HTMLImageElement'] || {})) {
            return false;
        }

        const userMatch = /User\:([a-zA-Z0-9\_]+)?$/.exec(item.href);
        const assumedUser = userMatch ? (userMatch[1] || '').replace(/\_/, ' ') : null;

        if (!this._userMapping[assumedUser]) return false;

        this._itemAddClassIfNeeded(item, 'mw-userlink');

        const userClass = `mw-ug-${this._userMapping[assumedUser]}`;
        this._itemAddClassIfNeeded(item, userClass);
    }
};

new UserBadges();
