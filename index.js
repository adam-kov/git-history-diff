#! /usr/bin/env node
import { program } from 'commander'
import chalk from 'chalk'
import shell from 'shelljs'
import fs from 'fs'

program
.version('v1.0.0')
.description('ghd (git-history-diff) is tool that outputs the changes in the number of lines for each file in each commit in a Git repository')
.argument('<outputDir>', 'the absolute path to the output directory, or use the working directory with "." and "./"')
.argument('[remote]', 'the URL to a remote Git repository, eg: https://github.com/facebook/react.git')
.option('-s, --silent', 'silence the progress messages')
.option('-n, --filename [type]', 'set the name of the output file, the extension (.json) should be omitted')
.parse(process.argv)

function exit(message) {
	if(message) shell.echo(message)
	shell.exit(1)
}

function progress(message) {
	if(program.getOptionValue('silent')) return
	shell.echo(chalk.blue(message))
}

function message(message) {
	if(program.getOptionValue('silent')) return
	shell.echo(message)
}

function stopTimer(time) {
	const elapsed = process.hrtime(time)[1] / 1000000
	message(chalk.green(`Done in ${process.hrtime(time)[0]}s ${elapsed.toFixed(0)}ms`))
}

start()

function start() {
	if(!shell.which('git')) exit(chalk.red('This tool requires Git to be installed'))

	const time = process.hrtime()
	const path = program.processedArgs[0] + ''
	let dir
	if(path === '.' || path === './') {
		dir = shell.pwd().stdout
	} else if(path.startsWith('/') || path.startsWith('./')) {
		dir = shell.pwd().stdout + path.slice(path[0] === '.' ? 1 : 0)
	}
	const tempFolder = 'ghd-repo-temp'
	let commits, history

	cloneRepo(tempFolder)
	commits = getCommits()
	history = getHistory(commits)
	outputJSON(history, dir)
	cleanup(tempFolder)
	stopTimer(time)
}

function cloneRepo(folder) {
	if(!program.processedArgs[1]) return
	progress('Cloning remote repository... (it will be deleted after the process)')

	shell.cd(shell.tempdir())
	shell.exec(`git clone ${program.processedArgs[1]} ${folder}`, { silent: true })
	shell.cd('./' + folder)
}

function getCommits() {
	progress('Getting commit references...')

	const commitHashes = shell.exec(
		'git log --reverse --pretty=format:"%H"',
		{ silent: true }
	).stdout.split(/\r?\n/g)
	if(!commitHashes.length) exit(chalk.yellow('There are no commits in this repository'))

	message('Found ' + commitHashes.length + ' commits')
	return commitHashes
}

function getHistory(commits) {
	progress('Creating history object... (processing about 1000 commits/minute on a reasonable CPU)')

	const history = []
	let currentCommit = {}
	
	// first commit
	const first = shell.exec(
		'git diff --numstat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 ' + commits[0],
		{ silent: true }
	).stdout.split(/\r?\n/g)
	
	first.forEach(row => {
		if(!row) return
	
		const values = row.split(/\t/g)
		// excluding binary files
		if(isNaN(+values[0])) return

		currentCommit = {
			...currentCommit,
			[values[2]]: +values[0]
		}
	})
	history.push({ ...currentCommit })
	
	// further commits
	for(let i = 1; i < commits.length; i++) {
		if((i + 1) % 100 === 0) {
			message('Processing ' + (i + 1) + '. commit')
		}
		
		const table = shell.exec(
			`git diff --numstat ${commits[i - 1]} ${commits[i]}`,
			{ silent: true }
		).stdout.split(/\r?\n/g)

		currentCommit = {}
		table.forEach(row => {
			if(!row) return
		
			const values = row.split(/\t/g)
			// excluding binary files
			if(isNaN(+values[0]) || isNaN(+values[1])) return
			
			const name = values[2]
			if(name.includes(' => ')) {
				// file got moved or renamed
				const half = name.split('{')
				const third = half[1].split('}')
				const first = half[0]
				const mid = third[0]
				const last = third[1]
				const midHalf = mid.split(' => ')
				const fromName = (first + midHalf[0] + last).replace(/\/\//g, '/')
				const toName = (first + midHalf[1] + last).replace(/\/\//g, '/')
				const diff = +values[0] - +values[1]
				let value = 0
				
				history.forEach(commit => value += commit[fromName] || 0)

				currentCommit = {
					...currentCommit,
					[fromName]: -value,
					[toName]: value + diff
				}
			} else {
				const diff = +values[0] - +values[1]
				if(!diff) return
	
				currentCommit = {
					...currentCommit,
					[values[2]]: diff
				}
			}
		})
		history.push({ ...currentCommit })
	}

	return history
}

function outputJSON(history, dir) {
	progress('Finalizing JSON...')

	const json = JSON.stringify(history)
	const n = program.getOptionValue('filename')
	const fileName = n ? n + '.json' : 'ghd-history.json'

	shell.mkdir('-p', dir)
	shell.cd(dir)
	shell.touch(dir + '/' + fileName)
	fs.writeFileSync(fileName, json)
}

function cleanup(folder) {
	if(!program.processedArgs[1]) return
	progress('Cleaning up...')

	shell.cd(shell.tempdir())
	shell.rm('-rf', folder)
}