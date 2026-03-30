# Publishing to the GitHub Wiki

The category SEO process is documented for the wiki in **`Category-Page-SEO-Updates.md`**.

**Wiki home:** [optizenapp/theequestrian/wiki](https://github.com/optizenapp/theequestrian/wiki)

## One-time: clone the wiki repository

GitHub stores the wiki in a separate git repo. Clone it as a user who can push (GitHub user **`optizenapp`**, or an account with write access):

```bash
cd ~/some-parent-directory
git clone https://github.com/optizenapp/theequestrian.wiki.git theequestrian-wiki
cd theequestrian-wiki
```

Use HTTPS with a [personal access token](https://github.com/settings/tokens) or SSH if `git@github.com:optizenapp/theequestrian.wiki.git` is configured for that user.

## Update the wiki page after changing the runbook

1. Edit the canonical runbook in the main repo: **`docs/CATEGORY-SEO-OPTIMISATION-RUNBOOK.md`**
2. Rebuild the wiki mirror (prepends `_wiki-banner.md` automatically):

   ```bash
   cd /path/to/theequestrian
   cat docs/github-wiki/_wiki-banner.md docs/CATEGORY-SEO-OPTIMISATION-RUNBOOK.md > docs/github-wiki/Category-Page-SEO-Updates.md
   ```

3. Commit the main repo if you want the mirror tracked in git.
4. Copy the file into the wiki clone and push:

   ```bash
   cp docs/github-wiki/Category-Page-SEO-Updates.md ~/path/to/theequestrian-wiki/Category-Page-SEO-Updates.md
   cd ~/path/to/theequestrian-wiki
   git add Category-Page-SEO-Updates.md
   git commit -m "docs(wiki): refresh category page SEO runbook"
   git push origin master
   ```

   Some wikis use `main` as default branch; use `git branch -a` if `master` fails.

## Optional: link from the wiki Home

On the wiki **Home** page, add a bullet under Documentation:

- [Category Page SEO Updates](Category-Page-SEO-Updates) — GSC-driven category content, `collection_content`, scripts

## Cursor / git identity

To push as **optizenapp**, ensure local git user matches that account for this repo, or use GitHub CLI (`gh auth login`) logged in as optizenapp before `git push` to the `.wiki` remote.
