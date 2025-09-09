# honcpiler scripts

If you want to upload a new package to the KV storage:

```
# you can also place these variables in a .env file
export CF_ACCOUNT_ID=d49b8f4bbd035f3851d1e478dbc6f1a8
export CF_NAMESPACE_ID=b1e708b8b87a48159929cc0f48f2ef81
export CF_API_TOKEN=<your token>

pnpm run seed:kv:prod "<package>"
```

The script will download the latest version of the package and put it
in the production honcpiler KV namespace

If you wish to upload it to a local KV namespace, make sure you have
wrangler installed and then run the above pnpm with the `seed:kv:local`
subcommand instead.
