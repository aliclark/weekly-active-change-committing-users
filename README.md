# Weekly Active Change-Committing Users
## Number of users changing ten or more lines for any given file type each week

### Algorithm to ignore spam

The raw commit data on GitHub is not representative, as it's mostly automation commits and a bunch of skeleton / template commits.

These can be filtered by looking at the histogram of counts and only considering where `A > B` (given that we want to only consider `A` where it is at the same order, or at a larger order of magnitude than `B`).

For example, we may want to only consider `user logins` where the `number of user logins` having a `given number of authors committing` via that `user login` is greater than the `number of user logins`. Whatever that threshold is will be the cut-off. In the extreme case, `github-actions` account might commit on behalf of exactly 9000 authors, but since there is only 1 account committing that number of unique authors, trivially the check `9000 <= 1` is not satisfied, and `github-actions` can be ignored.

From this reduced set we can continue to further reduce by looking at other variables and ignoring "spammy values" for each variable.

```
Find non-crank authors by historgram distribution
  of those, find non-crank actors ditto
    of those, find non-crank repo counts ditto
      of those, find non-crank pushes ditto
        of those, find non-crank commit counts ditto
          of those, find non-crank commit messages ditto
```

Partial work on an SQL query to filter automation accounts:

```sql
SELECT COUNT(DISTINCT name_login_pairs_raw.name) AS names, name_logins.logins AS logins
  FROM
    (SELECT JSON_EXTRACT_SCALAR(payload, '$.commits[0].author.name') AS name, actor.login AS login
      FROM githubarchive.day.20210306
      WHERE type='PushEvent'
      GROUP BY name, login)
     AS name_login_pairs_raw,
    (SELECT JSON_EXTRACT_SCALAR(payload, '$.commits[0].author.name') AS name, COUNT(DISTINCT actor.login) AS logins
      FROM githubarchive.day.20210306
      WHERE type='PushEvent'
      GROUP BY name
      HAVING logins <= 14)
     AS name_logins
  WHERE name_login_pairs_raw.name=name_logins.name
  GROUP BY logins
  ORDER BY logins
```
