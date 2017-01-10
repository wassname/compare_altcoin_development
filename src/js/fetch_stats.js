/**
 * TODO cache requests by date
 */

// cache and save github api token
$('#token').val(localStorage['gh_token'])
$('#token').on('change', function() {
    localStorage['gh_token'] = $('$token').val()
})

let gh = new GitHub(localStorage['gh_token'] || '')

function promiseGitHubStats(url) {

    var apiUrl = url.replace('https://github.com/', '')

    var promiseStats = new Promise(function(resolve, reject) {
        gh.get("repos/" + apiUrl, (err, response) => {
            if (err)
                reject(err)
            else
                resolve(response)
        })
    })

    var promiseContributors = new Promise(function(resolve, reject) {
        gh.get("repos/" + apiUrl + '/stats/contributors', (err, response) => {
            if (err)
                reject(err)
            else
                resolve(response)
        })
    }).then(r => {
        return {
            contributors: r.length,
            //commits: _.sum(r.map(c => c.total))
        }
    })

    var promiseCommits = new Promise(function(resolve, reject) {
        gh.get("repos/" + apiUrl + '/stats/participation', (err, response) => {
            if (err)
                reject(err)
            else
                resolve(response)
        })
    }).then(r => {
        return {
            'commits_per_week': _.round(_.mean(r.all), 3)
        }
    })

    var promiseReleases = new Promise(function(resolve, reject) {
        gh.get("repos/" + apiUrl + '/releases', (err, response) => {
            if (err)
                reject(err)
            else
                resolve(response)
        })
    }).then(r => {
        return {'releases': r.length}
    })

    https : //api.github.com/repos/bitcoin/bitcoin/releases

    return Promise.all([promiseStats, promiseContributors, promiseCommits, promiseReleases]).then(data => _.merge(...data))

}

function promiseBitbucketStats(url) {
    url = url.replace('https://bitbucket.org/', 'https://api.bitbucket.org/2.0/repositories/')

    // get all commits using a while(res.next) loop, then filter by date, to get comits per week. This part is slow
    console.log(url)
    var promiseCommits = new Promise(function(resolve, reject) {
        var data = []

        var doSeq = (curl) => {
            $.get(curl).then(r => {
                data.push(...r.values)
                if (!r.next) {
                    return resolve(data)
                } else {
                    return doSeq(r.next)
                }
            })

        }
        return doSeq(url + '/commits?pagelen=100')

    }).then(data => {
        // keep only commits this year, then get average
        var year_ago = moment().subtract(1, 'year')
        var commits_per_week = data.filter(dat => moment(dat.date) > year_ago).length / 52
        commits_per_week = _.round(commits_per_week, 3)
        return {commits_per_week}
    })

    return Promise.all([
        promiseCommits,
        $.get(url),
        $.get(url + '/forks').then(data => ({forks: data.size})),
        $.get(url + '/issues').then(data => ({issues: data.size})),
        $.get(url + '/watchers').then(data => ({watchers: data.size})),
        $.get(url + '/issues').then(data => ({open_issues: data.size})),
        $.get(url + '/downloads').then(data => ({releases: data.size}))
    ]).then(data => _.merge(...data)).then(data => {
        data.updated_at = data.updated_on
        data.created_at = data.created_on
        return data
    })

}
