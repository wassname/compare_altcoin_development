/**

TODO:
- consider using add/minus as well/instead of commits
- total commits (add contributor contributions)
- sum projects over organisations
- paginate contributors to get over 100
- see if it's a fork?
**/

// format: name from on coinmarketcap: core Github project or repo

var columns = [
    {
        "data": "coin",
        "title": "coin"
    }, {
        "data": "commits_per_week",
        "title": "commits_per_week (for last year)"
    }, {
        "data": "watchers",
        "title": "watchers"
    }, {
        "data": "open_issues",
        "title": "open_issues"
    },

    //{
    //    "data": "size",
    //    "title": "size"
    //},
    {
        "data": "created_at",
        "title": "created_at"
    }, {
        "data": "updated_at",
        "title": "updated_at"
    }, {
        "data": "contributors",
        "title": "contributors (up to 100)"
    }, {
        "data": "forks",
        "title": "forks"
    }, {
        "data": "releases",
        "title": "releases"
    }, {
        "data": "language",
        "title": "language"
    },
    //{
    //  "data": "description",
    //  "title": "description"
    //},

    {
        "data": "url",
        "title": "url"
    }
]

/** parse dates then format **/
function parseDates(data) {
    return data.map(row => {
        for (key in row) {
            if (key.endsWith('_at') && typeof key == "string") {
                row[key] = new moment(row[key]).format('YYYY/MM/DD')
            }
        }
        return row
    })
}

// dirty hack -  make a markdown table for reddit
function makeMarkDownTable(data) {
    var table_cols = [
        "coin",
        "commits_per_week",
        "watchers",
        "open_issues",
        "created_at",
        "updated_at",
        "contributors"
    ]
    var d2 = data.map(row => _.pick(row, table_cols))
    d2 = d2.sort((a, b) => b.commits_per_week - a.commits_per_week)
    var h = columns.filter(col => table_cols.includes(col.data)).map(c => c.title)

    var table = ''
    table += '|' + h.join('|') + '|\n'
    table += '|' + h.map(n => '---').join('|') + '|\n'
    table += d2.map(row => '|' + _.values(row).join('|') + '|\n').join('')
    return table
}

$(document).ready(function() {

    // Collect data
    let promises = Object.keys(coins).map(coin => {
        var url = coins[coin]
        if (url.includes('github.com')) {
            return promiseGitHubStats(url).then(data => {
                data.coin = coin
                data.url = url
                return data
            })
        } else {
            return promiseBitbucketStats(url).then(data => {
                data.coin = coin
                data.url = url
                return data
            })
        }

    })

    Promise.all(promises).then(data => {
        data = parseDates(data)
        localStorage['gh-data'] = JSON.stringify(data)
        $('#table').DataTable({
            data: _.values(data),
            columns,
            "order": [
                [1, "desc"]
            ]
        })

        $('#markdown').val(makeMarkDownTable(data))
    })
})
