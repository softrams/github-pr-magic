<div align="center">

![Pull Request Magic](docs/images/multi_color.png#gh-light-mode-only)

![Pull Request Magic](docs/images/white.png#gh-dark-mode-only)

# Magic Automating Pull Request

AI Powered Automation for Pull Requests, We're here to help understand and grow the ability to automate a Pull Request. 

</div>

## ✨ Features

- Line by line code review
- Overall Summary of the Pull Request in a comment
- Rewritting or Writing a Pull Request Desciption based on Pull Request Code
- Auto Approving of Pull Request
- Merging of Pull Request (🔥 Coming Soon)

## 🚀 Usage

### 👁️ Basic Setup
```yaml
name: AI Code Reviewer

on: 
    pull_request:
        types:
          - opened
          - reopened 
          - synchronize
jobs: 
    code_review:
        runs-on: ubuntu-latest
        steps: 
            - name: Checkout
              uses: actions/checkout@v4
            - name: AI Reviewer
              uses: softrams/github-pr-magic@v0.0.1-beta
              with: 
                github_token: ${{ secrets.GITHUB_TOKEN }}
                openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

## 🔥 Configurable Fields
Below is a list of configurable fields that can be used with the ***Magic Github Action***

| Name | Type | Default Value | Required |
|--|--|--|--|
| github_token | string | none | yes |
| openai_api_key | string | none | yes |
| excluded_files | []string | ['node_modules, package-lock.json, yarn.lock'] | no |
| openai_model | string | 'gpt-4' | no |
| review_code | boolean | true | no |
| generate_summary | boolean | false | no |
| overall_code_review | boolean | false | no |
| auto_approve | boolean | false | no |
