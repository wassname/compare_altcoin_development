/**
 * TODO cache requests by date
 */
LITE_MODE = localStorage['LITE_MODE']

let gh = new GitHub(localStorage['gh_token'] || '')

$(document).ready(function() {
    // cache and save github api token
    $('#token').val(localStorage['gh_token'])
    $('#token').on('change', function() {
        localStorage['gh_token'] = $('#token').val()
    })
    gh = new GitHub(localStorage['gh_token'] || '')
})

var MergeBySumingNumbers = objects => objects.reduce((s, r) => {
    Object.keys(r).map(key => {
        v = r[key]
        if (typeof(v) === "number") {
            s[key] = _.round((s[key] || 0) + v, 3)
        } else
            s[key] = v
    })
    return s
}, {})

function promiseGitHubRepoStats(url) {

    var apiUrl = "repos/" + url.replace('https://github.com/', '')

    var promiseStats = new Promise(function(resolve, reject) {
        gh.get(apiUrl, (err, response) => {
            if (err)
                reject(err)
            else
                resolve(response)
        })
    })

    if (LITE_MODE) {
        return promiseStats
    }

    var promiseContributors = new Promise(function(resolve, reject) {
        gh.get(apiUrl + '/contributors', {
            all: true,
            opts: {
                per_page: 100
            }
        }, (err, response) => {
            if (err)
                reject(err)
            else
                resolve(response)
        })
    }).then(r => {
        return {
            contributors: r.length,
            commits: _.sum(r.map(c => c.contributions))
        }
    })

    var promiseCommits = new Promise(function(resolve, reject) {
        gh.get(apiUrl + '/stats/participation', {
            opts: {
                per_page: 100
            }
        }, (err, response) => {
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

    var promiseChanges = new Promise(function(resolve, reject) {
        gh.get(apiUrl + '/stats/code_frequency', {
            opts: {
                per_page: 100
            }
        }, (err, response) => {
            if (err)
                reject(err)
            else
                resolve(response)
        })
    }).then(r => {
        return {
            'code_frequency': _.round(_.mean(r.total), 3)
        }
    })

    var promiseReleases = new Promise(function(resolve, reject) {
        gh.get(apiUrl + '/releases', {
            opts: {
                per_page: 100
            }
        }, (err, response) => {
            if (err)
                reject(err)
            else
                resolve(response)
        })
    }).then(r => {
        return {'releases': r.length}
    })

    return Promise.all([promiseStats, promiseContributors, promiseChanges, promiseCommits, promiseReleases]).then(data => _.merge(...data))
}

function promiseGitHubRepoStatsMulti(repos) {
    return Promise.all(repos.map(promiseGitHubRepoStats)).then(MergeBySumingNumbers)
}

function promiseGitHubOrgStats(org) {
    var apiUrl = org.replace('https://github.com/', '') + '/repos'
    return new Promise(function(resolve, reject) {
        gh.get(apiUrl, {
            opts: {
                per_page: 100
            }
        }, (err, response) => {
            if (err)
                reject(err)
            else
                resolve(response)
        })
    }).then(data => data
    // we could filter out minor repos here
        .filter(row => row.stargazers_count > 7 && moment(row.updated_at) > moment().subtract(12, 'months') && row.private === false && row.archived === false).map(row => row.full_name)).then(promiseGitHubRepoStatsMulti)
}

function promiseBitbucketRepoStats(url) {
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
