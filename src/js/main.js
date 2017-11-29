
// format: name from on coinmarketcap: core Github project or repo
function renderUrl(data) {
    return '<a href="' + data + '">' + data + '</a>'
}
function renderDate(data) {
    return data
        ? moment(data).format('YYYY/MM/DD')
        : data
}

var columns = [
    {
        "data": "coin",
        "title": "coin"
    }, {
        "data": "commits_per_week",
        "title": "commits per week (for last year)"
    }, {
        "data": "watchers",
        "title": "watchers"
    }, {
        "data": "open_issues",
        "title": "open issues"
    }, {
        "data": "size",
        "title": "size",
        "visible": false
    }, {
        "data": "created_at",
        "title": "created",
        render: renderDate
    }, {
        "data": "updated_at",
        "title": "updated",
        render: renderDate
    }, {
        "data": "contributors",
        "title": "contributors"
    }, {
        "data": "forks",
        "title": "forks"
    }, {
        "data": "releases",
        "title": "releases"
    }, {
        "data": "language",
        "title": "language"
    }, {
        "data": "description",
        "title": "description",
        "visible": false
    }, {
        "data": "commits",
        "title": "commits",
        "visible": false
    }, {
        "data": "code_frequency",
        "title": "code frequency",
        "visible": false
    }, {
        "data": "pushed_at",
        "title": "pushed",
        "visible": false,
        render: renderDate
    }, {
        "data": "url",
        "title": "url",
        render: renderUrl
    },
    // {
    //   "data": "id",
    //   "title": "id",
    //   "visible": false
    // },
    {
        "data": "name",
        "title": "name",
        "visible": false
    },
    // {
    //   "data": "full_name",
    //   "title": "full_name",
    //   "visible": false
    // },
    // {
    //   "data": "owner",
    //   "title": "owner",
    //   "visible": false
    // },
    // {
    //   "data": "private",
    //   "title": "private",
    //   "visible": false
    // },
    {
        "data": "fork",
        "title": "fork",
        "visible": false
    }, {
        "data": "homepage",
        "title": "homepage",
        "visible": false,
        render: renderUrl
    },
    // {
    //   "data": "default_branch",
    //   "title": "default_branch",
    //   "visible": false
    // },
    // {
    //   "data": "permissions",
    //   "title": "permissions",
    //   "visible": false
    // },

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

/** fill missing attribtes so datatables stops complaining **/
function fillAll(data, columns) {
    return data.filter(_.isObject).map(row => {
        for (var i = 0; i < columns.length; i++) {
            var key = columns[i].data
            if (row[key] === undefined)
                row[key] = ''
        }
        return row
    })
}

function refresh() {

    var coins = $('#repos').val().trim().split('\n').filter(row => !row.startsWith('#')).map(row => row.split(',', 2)).reduce((o, [key, value]) => {
        o[key] = value
        return o
    }, {})

    // Collect data
    let promises
    let countdown = Object.keys(coins).length
    let total = countdown * 1
    $("#go").prop('disabled', true);
    $("#go").text('' + countdown)
    if (!localStorage['gh-data'])
        promises = Promise.all(Object.keys(coins).map(coin => {
            var url = coins[coin]
            // TODO(mjc) if its a user, list repos
            // TODO(mjc) if url is a list, do promiseGitHubRepoStatsMulti
            if (url.includes('github.com')) {
                if (url.includes(' ')) {
                    // handle a list of repos
                    return promiseGitHubRepoStatsMulti(url.split(' ')).then(data => {
                        data.coin = coin
                        data.url = url
                        return data
                    }).catch(err => {
                        console.error(err, url, coin)
                    })
                } else if (url.includes('https://github.com/orgs') || url.includes('https://github.com/users')) {
                    // handle github org or user
                    return promiseGitHubOrgStats(url).then(data => {
                        data.coin = coin
                        data.url = url
                        return data
                    }).catch(err => {
                        console.error(err, url, coin)
                    })

                } else {
                    return promiseGitHubRepoStats(url).then(data => {
                        data.coin = coin
                        data.url = url
                        return data
                    }).catch(err => {
                        console.error(err, url, coin)
                    })
                }
            } else {
                return promiseBitbucketRepoStats(url).then(data => {
                    data.coin = coin
                    data.url = url
                    return data
                }).catch(err => {
                    console.error(err, url, coin)
                })
            }

        }).map(promise => promise.then(value => {
            countdown -= 1
            $("#go").text(`${countdown}/${total}`)
            return value
        })
        .catch(err => {console.error(err)}))).then((data) => {
            // cache so I can provide an offline snapshot
            localStorage['gh-data2'] = JSON.stringify(data)
            return data
        })
    else
        promises = Promise.resolve(JSON.parse(localStorage['gh-data']))

    promises.then(data => {
        // data = parseDates(data)
        data = fillAll(data, columns)

        $('#table').DataTable({
            data: _.values(data),
            columns,
            "order": [
                [1, "asc"]
            ],
            pageLength: 100,
            "lengthMenu": [
                10,
                25,
                50,
                75,
                100,
                800
            ],
            buttons: ['colvis'],
            stateSave: true,
            dom: 'Bfrtip'
        })

        $("#go").prop('disabled', false);
        $("#go").text("Go")

        var markdown = makeMarkDownTable(data)
        console.log(markdown)
        // $('#markdown').val(markdown)
    })
}

$(document).ready(function() {
    // DEV purposes only
    $('#clear').on('click', function() {
        localStorage['gh-data'] = ''
        window.location.reload()
    })
    $('#go').on('click', function() {
        refresh()
    })
    refresh()
})
