#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

function runGitCommand(command) {
    try {
        return execSync(command, { encoding: 'utf8' }).trim();
    } catch (error) {
        console.error(`Error running: ${command}`);
        return '';
    }
}

function getCommitStats(hash) {
    const stats = runGitCommand(`git show --stat --format="" ${hash}`);
    const diffStat = runGitCommand(`git show --shortstat --format="" ${hash}`);
    return { stats, diffStat };
}

function getCommitDetails(hash) {
    try {
        const fullHash = runGitCommand(`git log -1 --format=%H ${hash}`);
        const subject = runGitCommand(`git log -1 --format=%s ${hash}`);
        const author = runGitCommand(`git log -1 --format=%an ${hash}`);
        const date = runGitCommand(`git log -1 --format=%ad ${hash}`);
        const relativeDate = runGitCommand(`git log -1 --format=%ar ${hash}`);
        return { fullHash, subject, author, date, relativeDate };
    } catch (error) {
        return { fullHash: hash, subject: 'Unknown', author: 'Unknown', date: 'Unknown', relativeDate: 'Unknown' };
    }
}

function analyzeRepository() {
    console.log('='.repeat(60));
    console.log('GIT REPOSITORY ANALYSIS');
    console.log('='.repeat(60));
    
    // Get basic repo info
    const repoRoot = runGitCommand('git rev-parse --show-toplevel');
    const currentBranch = runGitCommand('git branch --show-current');
    const totalCommits = runGitCommand('git rev-list --count HEAD');
    
    console.log(`Repository: ${repoRoot}`);
    console.log(`Current Branch: ${currentBranch}`);
    console.log(`Total Commits: ${totalCommits}`);
    console.log('');
    
    // Get all commits in chronological order
    const commits = runGitCommand('git log --reverse --format=%H').split('\n').filter(Boolean);
    
    if (commits.length === 0) {
        console.log('No commits found in repository');
        return;
    }
    
    console.log('COMMIT HISTORY (Chronological Order)');
    console.log('-'.repeat(60));
    
    commits.forEach((hash, index) => {
        const details = getCommitDetails(hash);
        const { stats, diffStat } = getCommitStats(hash);
        
        console.log(`${index + 1}. ${details.subject}`);
        console.log(`   Hash: ${hash.substring(0, 8)}`);
        console.log(`   Author: ${details.author}`);
        console.log(`   Date: ${details.date}`);
        console.log(`   Relative: ${details.relativeDate}`);
        
        if (diffStat) {
            console.log(`   Changes: ${diffStat}`);
        }
        
        if (stats) {
            const fileLines = stats.split('\n').filter(line => 
                line.includes('|') && !line.includes('files changed')
            ).slice(0, 5); // Show first 5 files
            
            if (fileLines.length > 0) {
                console.log('   Files changed:');
                fileLines.forEach(line => {
                    const fileName = line.split('|')[0].trim();
                    console.log(`     - ${fileName}`);
                });
                
                if (stats.split('\n').length - 2 > 5) {
                    console.log(`     ... and ${stats.split('\n').length - 7} more files`);
                }
            }
        }
        console.log('');
    });
    
    // Overall statistics
    console.log('OVERALL PROJECT STATISTICS');
    console.log('-'.repeat(60));
    
    const firstCommit = commits[0];
    const lastCommit = commits[commits.length - 1];
    
    const firstCommitDetails = getCommitDetails(firstCommit);
    const lastCommitDetails = getCommitDetails(lastCommit);
    
    console.log(`First Commit: ${firstCommitDetails.subject}`);
    console.log(`  Date: ${firstCommitDetails.date}`);
    console.log(`  Hash: ${firstCommit.substring(0, 8)}`);
    console.log('');
    
    console.log(`Latest Commit: ${lastCommitDetails.subject}`);
    console.log(`  Date: ${lastCommitDetails.date}`);
    console.log(`  Hash: ${lastCommit.substring(0, 8)}`);
    console.log('');
    
    // Show total changes from start to now
    const totalChanges = runGitCommand(`git diff --shortstat ${firstCommit} HEAD`);
    if (totalChanges) {
        console.log(`Total Changes from Start to Now: ${totalChanges}`);
    }
    
    // File count changes
    const currentFiles = runGitCommand('find . -type f -not -path "./.git/*" -not -path "./node_modules/*" | wc -l');
    console.log(`Current Files (excluding git/node_modules): ${currentFiles.trim()}`);
    
    // Show current project structure
    console.log('');
    console.log('CURRENT PROJECT STRUCTURE');
    console.log('-'.repeat(60));
    
    try {
        const tree = runGitCommand('git ls-tree -r --name-only HEAD | grep -v node_modules | head -20');
        if (tree) {
            tree.split('\n').forEach(file => {
                console.log(`  ${file}`);
            });
        }
    } catch (error) {
        console.log('Could not get project structure');
    }
    
    // Development timeline
    console.log('');
    console.log('DEVELOPMENT TIMELINE');
    console.log('-'.repeat(60));
    
    const timelineData = commits.map(hash => {
        const details = getCommitDetails(hash);
        return {
            date: new Date(details.date),
            subject: details.subject,
            hash: hash.substring(0, 8)
        };
    });
    
    // Group by date
    const byDate = {};
    timelineData.forEach(commit => {
        const dateStr = commit.date.toDateString();
        if (!byDate[dateStr]) {
            byDate[dateStr] = [];
        }
        byDate[dateStr].push(commit);
    });
    
    Object.keys(byDate).sort().forEach(dateStr => {
        console.log(`${dateStr}:`);
        byDate[dateStr].forEach(commit => {
            console.log(`  - ${commit.subject} (${commit.hash})`);
        });
        console.log('');
    });
}

// Run the analysis
analyzeRepository();