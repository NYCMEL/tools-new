# Stock Buy Scanner

A GitHub Pages stock scanner that displays only buy signals based on Stooq daily historical prices.

## Signals

- `W`: current closing price is below the previous completed week's low
- `M`: current closing price is below the previous completed month's low
- `WM`: both conditions are true

## Project structure

```text
stock-scanner/
├── index.html
├── css/styles.css
├── js/app.js
├── data/stocks.json
├── tools/update_stocks.py
└── .github/workflows/update-stocks.yml
```

## Publish on GitHub Pages

1. Create a new GitHub repository.
2. Upload all project files, preserving the folders.
3. Open **Settings > Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select your default branch and the `/ (root)` folder.
6. Save.

## Generate live data

The included GitHub Action runs automatically every hour at minute 20.

To run it immediately:

1. Open the repository's **Actions** tab.
2. Select **Update stock scanner data**.
3. Select **Run workflow**.
4. Wait for the workflow to finish.
5. Refresh the GitHub Pages site.

## Change the watchlist

Edit `WATCHLIST` in:

```text
tools/update_stocks.py
```

Commit the change, then run the workflow.

## Run locally

From the project folder:

```bash
python3 tools/update_stocks.py
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Do not open `index.html` directly with a `file://` URL because browsers may block local JSON requests.

## Notes

Stooq symbols are automatically converted to lowercase US symbols such as `aapl.us`.
Stooq is an external data source and may occasionally delay, omit, or change data.
The included `data/stocks.json` initially contains sample values so the interface can be previewed before the first workflow run.
