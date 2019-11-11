const express = require('express')
const fetch = require('node-fetch')
const redis = require('redis')

const PORT = process.env.PORT || 5000
const REDIS_PORT = process.env.REDIS_PORT || 6379  // defualt redis port on docker
const REDIS_URL = process.env.REDIS_URL || '172.17.0.2' //docker ip
const client = redis.createClient(REDIS_PORT, REDIS_URL)

const app = express()

function cache(req, res, next){
    const { username } = req.params
    client.get(username, (err, data)=>{
        if(err) throw err
        if(username !== null){
            console.log('geting from catch')
            res.send(setRespons(username, data))
        }else{
            next()
        }
    })
}   

function setRespons(username, repos){
    return `<h2>${username} has ${repos} Github repos</h2>`
}

async function getRepos(req, res, next){
    try{
        console.log('Fetching data..')
        const { username } = req.params;
        const response = await fetch(`https://api.github.com/users/${username}`)
        const data = await response.json()
        const repos = data.public_repos
        //set data to Redis cash (save to one hour)
        client.setex(username, 3600, repos)

        res.send(setRespons(username, repos))
    }catch (err){
        console.error(err)
        res.status(500)
    }
}

app.get('/repos/:username', cache, getRepos)

app.listen(PORT, ()=>{
    console.log(`Running on port ${PORT}`)
})