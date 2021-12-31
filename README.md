# Git History Diff

This CLI tool scans a given Git repository and counts all the changes in the number of lines of code and outputs the result in a JSON file.

## Install

```
git clone https://github.com/n00pper/git-history-diff.git
cd git-history-diff
npm i -g .
```

## Usage

_If a local repository is used, `cd` to the directory first_
`ghd [options] <outputDir> [remote]`

| Argument          | Description                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------- |
| outputDir         | the absolute path to the output directory, or use the working directory with `.` and `./` |
| remote (optional) | the URL to a remote Git repository, eg: https://github.com/facebook/react.git             |

| Option                | Description                                                              |
| --------------------- | ------------------------------------------------------------------------ |
| -V, --version         | output the version number                                                |
| -s, --silent          | silence the progress messages                                            |
| -n, --filename [type] | set the name of the output file, the extension (.json) should be omitted |
| -h, --help            | display help for command                                                 |
