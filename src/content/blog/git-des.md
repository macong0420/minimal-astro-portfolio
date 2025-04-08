---
title: "Git 常用功能详解：从入门到进阶"
description: "Git 是一个强大的分布式版本控制系统，被广泛应用于软件开发和其他需要版本管理的领域。 本文将详细介绍 Git 最常用的功能，从基本操作到进阶技巧，帮助你更好地理解和使用 Git。"
publishedAt: "2025-04-08"
tags: ["git", "kaifa", "学习"]
---

# Git 常用功能详解：从入门到进阶

Git 是一个强大的分布式版本控制系统，被广泛应用于软件开发和其他需要版本管理的领域。 本文将详细介绍 Git 最常用的功能，从基本操作到进阶技巧，帮助你更好地理解和使用 Git。

## Git 的核心概念

*   **仓库 (Repository)：** 存储项目所有文件和历史记录的地方。 可以理解为一个文件夹，但 Git 会在其中创建一个 `.git` 子文件夹来管理版本信息。
*   **工作区 (Working Directory)：** 你实际编辑和修改文件的地方，也就是你的项目文件夹。
*   **暂存区 (Staging Area) / 索引 (Index)：** 一个中间区域，用于存放你准备提交的修改。 你可以将工作区中修改过的文件添加到暂存区，然后再提交到仓库。
*   **提交 (Commit)：** 将暂存区中的修改保存到仓库中，形成一个版本记录。 每次提交都应该包含有意义的修改说明。
*   **分支 (Branch)：** 一个独立的开发线路。 你可以在主分支 (通常是 `main` 或 `master`) 上创建新的分支，进行实验性开发或修复 Bug，而不会影响主分支。
*   **远程仓库 (Remote Repository)：** 位于服务器上的仓库，例如 GitHub、GitLab 或 Gitee。 你可以将本地仓库推送到远程仓库，或者从远程仓库拉取更新。

## Git 的常用功能及指令

### 1. 初始化仓库 (Initialize a Repository)

*   **功能：** 在现有目录或创建一个新目录并初始化一个 Git 仓库。
*   **指令：** `git init`
*   **示例：**

    ```bash
    # 在当前目录下初始化 Git 仓库
    git init

    # 在名为 "my_project" 的目录下初始化 Git 仓库
    git init my_project
    ```

### 2. 添加文件到暂存区 (Add Files to Staging Area)

*   **功能：** 将工作区中修改或新增的文件添加到暂存区，准备提交。
*   **指令：** `git add <file>` 或 `git add .` (添加所有修改过的文件)
*   **示例：**

    ```bash
    # 添加名为 "my_file.txt" 的文件到暂存区
    git add my_file.txt

    # 添加所有修改过的文件到暂存区
    git add .
    ```

### 3. 提交修改 (Commit Changes)

*   **功能：** 将暂存区中的修改保存到仓库中，并添加提交说明。
*   **指令：** `git commit -m "commit message"`
*   **示例：**

    ```bash
    # 提交修改，并添加提交说明
    git commit -m "Fix: Resolved a bug in the login module"
    ```

### 4. 查看状态 (Check Status)

*   **功能：** 查看工作区、暂存区和仓库的状态，了解哪些文件被修改过，哪些文件已经添加到暂存区，哪些文件还没有被 Git 管理。
*   **指令：** `git status`
*   **示例：**

    ```bash
    git status
    # 输出示例：
    # On branch main
    # Changes to be committed:
    #   (use "git restore --staged <file>..." to unstage)
    #         modified:   my_file.txt
    #
    # Untracked files:
    #   (use "git add <file>..." to include in what will be committed)
    #         new_file.txt
    ```

### 5. 查看提交历史 (View Commit History)

*   **功能：** 查看仓库的提交历史，包括提交的作者、日期、提交说明等信息。
*   **指令：** `git log`
*   **示例：**

    ```bash
    git log
    # 输出示例：
    # commit a1b2c3d4e5f6... (HEAD -> main)
    # Author: Your Name <your.email@example.com>
    # Date:   Tue Apr 9 10:00:00 2024 +0800
    #
    #     Fix: Resolved a bug in the login module
    ```

*   **常用参数：**
    *   `git log --oneline`：以简洁的单行形式显示提交历史。
    *   `git log --graph`：以图形化的方式显示分支合并历史。

### 6. 创建分支 (Create a Branch)

*   **功能：** 创建一个新的分支，用于进行独立的开发。
*   **指令：** `git branch <branch_name>`
*   **示例：**

    ```bash
    # 创建一个名为 "feature/new_feature" 的分支
    git branch feature/new_feature
    ```

### 7. 切换分支 (Switch Branches)

*   **功能：** 切换到指定的分支。
*   **指令：** `git checkout <branch_name>`
*   **示例：**

    ```bash
    # 切换到 "feature/new_feature" 分支
    git checkout feature/new_feature
    ```

*   **快捷方式：** `git checkout -b <branch_name>` 可以创建并切换到新分支。

### 8. 合并分支 (Merge Branches)

*   **功能：** 将一个分支的修改合并到另一个分支。 通常是将开发分支合并到主分支。
*   **指令：** `git merge <branch_name>` (先切换到要合并到的目标分支，再执行 merge 命令)
*   **示例：**

    ```bash
    # 切换到主分支 (例如 "main")
    git checkout main

    # 将 "feature/new_feature" 分支合并到 "main" 分支
    git merge feature/new_feature
    ```

*   **注意：** 合并过程中可能会出现冲突 (Conflict)，需要手动解决冲突。

### 9. 推送到远程仓库 (Push to Remote Repository)

*   **功能：** 将本地仓库的修改推送到远程仓库，使其他人可以获取你的代码。
*   **指令：** `git push <remote_name> <branch_name>`
*   **示例：**

    ```bash
    # 将本地 "main" 分支推送到名为 "origin" 的远程仓库
    git push origin main
    ```

*   **首次推送：** 如果是首次推送，可能需要设置远程仓库的 URL：

    ```bash
    git remote add origin <remote_repository_url>
    git push -u origin main  # -u 参数设置默认的 upstream 分支
    ```

### 10. 从远程仓库拉取更新 (Pull from Remote Repository)

*   **功能：** 从远程仓库拉取最新的代码更新到本地仓库。
*   **指令：** `git pull <remote_name> <branch_name>`
*   **示例：**

    ```bash
    # 从名为 "origin" 的远程仓库拉取 "main" 分支的更新
    git pull origin main
    ```

### 11. 克隆远程仓库 (Clone a Remote Repository)

*   **功能：** 将远程仓库的代码克隆到本地。
*   **指令：** `git clone <remote_repository_url>`
*   **示例：**

    ```bash
    # 克隆远程仓库到本地
    git clone https://github.com/your_username/your_repository.git
    ```

### 12. 撤销修改 (Undo Changes)

*   **撤销工作区的修改：** `git restore <file>` (会覆盖工作区的文件，谨慎使用)
*   **撤销暂存区的修改：** `git restore --staged <file>` (将文件从暂存区移除)
*   **撤销提交 (Commit)：** `git revert <commit_id>` (创建一个新的提交，用于撤销指定的提交，不会修改历史记录，推荐使用) 或者 `git reset <commit_id>` (会修改历史记录，慎用)

## Git 进阶功能

### 1. 比较 (Compare)

*   **功能：** 比较不同版本、分支或文件之间的差异。
*   **指令：**
    *   `git diff`：比较工作区与暂存区的差异。
    *   `git diff --staged` 或 `git diff --cached`：比较暂存区与最近一次提交 (HEAD) 的差异。
    *   `git diff <commit1> <commit2>`：比较两个提交之间的差异。
    *   `git diff <branch1> <branch2>`：比较两个分支之间的差异。
    *   `git diff <file>`：比较工作区中指定文件与暂存区的差异。
    *   `git diff HEAD <file>`: 比较工作区中指定文件与最新提交的差异
*   **示例：**

    ```bash
    # 比较工作区和暂存区的差异
    git diff

    # 比较暂存区和最近一次提交的差异
    git diff --staged

    # 比较两个提交之间的差异
    git diff a1b2c3d4 e5f6g7h8

    # 比较两个分支之间的差异
    git diff main feature/new_feature

    # 比较工作区中 "my_file.txt" 文件与暂存区的差异
    git diff my_file.txt
    ```

### 2. 重置 (Reset)

*   **功能：** 将当前分支的 HEAD 指针移动到指定的提交，并根据参数选择性地修改工作区和暂存区。 **请谨慎使用 `git reset`，因为它会修改提交历史。**
*   **指令：**
    *   `git reset --soft <commit>`：将 HEAD 指针移动到指定的提交，但保留工作区和暂存区的修改。
    *   `git reset --mixed <commit>`：将 HEAD 指针移动到指定的提交，并且将暂存区的修改撤销，但保留工作区的修改。(默认选项，可以省略 `--mixed`)
    *   `git reset --hard <commit>`：将 HEAD 指针移动到指定的提交，并且撤销工作区和暂存区的所有修改。 **会丢失数据，请务必谨慎使用！**
*   **示例：**

    ```bash
    # 将 HEAD 指针移动到指定的提交，但保留工作区和暂存区的修改
    git reset --soft a1b2c3d4

    # 将 HEAD 指针移动到指定的提交，并且将暂存区的修改撤销，但保留工作区的修改
    git reset --mixed a1b2c3d4

    # 将 HEAD 指针移动到指定的提交，并且撤销工作区和暂存区的所有修改 (会丢失数据，请务必谨慎使用！)
    git reset --hard a1b2c3d4
    ```

*   **注意：**
    *   `<commit>` 可以是提交 ID (commit hash)、分支名、HEAD (当前提交) 或 HEAD^ (上一个提交)。
    *   通常情况下，应该尽量避免使用 `git reset --hard`，因为它会永久删除数据。
    *   如果已经将修改推送到远程仓库，`git reset` 可能会导致远程仓库和本地仓库不一致，需要强制推送 (force push)，这可能会影响其他人的工作。

### 3. 储藏 (Stash)

*   **功能：** 临时保存工作区的修改，以便切换到其他分支或执行其他任务。
*   **指令：**
    *   `git stash`：储藏当前工作区的修改。
    *   `git stash save "message"`：储藏当前工作区的修改，并添加描述信息。
    *   `git stash list`：查看储藏列表。
    *   `git stash apply`：应用最近一次储藏的修改。
    *   `git stash apply stash@{n}`：应用指定的储藏 (n 是储藏在列表中的索引)。
    *   `git stash pop`：应用最近一次储藏的修改，并从储藏列表中删除。
    *   `git stash drop stash@{n}`：删除指定的储藏。
    *   `git stash clear`：清空储藏列表。
*   **示例：**

    ```bash
    # 储藏当前工作区的修改
    git stash

    # 储藏当前工作区的修改，并添加描述信息
    git stash save "WIP: Working on a new feature"

    # 查看储藏列表
    git stash list

    # 应用最近一次储藏的修改
    git stash apply

    # 应用指定的储藏
    git stash apply stash@{0}

    # 应用最近一次储藏的修改，并从储藏列表中删除
    git stash pop

    # 删除指定的储藏
    git stash drop stash@{1}

    # 清空储藏列表
    git stash clear
    ```

### 4. 变基 (Rebase)

*   **功能：** 将一个分支的修改应用到另一个分支上，并修改提交历史。 **请谨慎使用 `git rebase`，因为它会修改提交历史。**
*   **指令：** `git rebase <branch>` (先切换到要变基的目标分支，再执行 rebase 命令)
*   **示例：**

    ```bash
    # 切换到 "feature/new_feature" 分支
    git checkout feature/new_feature

    # 将 "feature/new_feature" 分支变基到 "main" 分支上
    git rebase main
    ```

*   **注意：**
    *   变基过程中可能会出现冲突 (Conflict)，需要手动解决冲突，然后使用 `git add` 和 `git rebase --continue` 命令继续变基。
    *   如果出现问题，可以使用 `git rebase --abort` 命令中止变基。
    *   `git rebase` 通常用于保持提交历史的整洁，但会修改提交历史，因此不建议在公共分支上使用。

### 5. 标签 (Tag)

*   **功能：** 为某个提交打上标签，用于标记重要的版本 (例如，发布版本)。
*   **指令：**
    *   `git tag <tag_name>`：创建一个轻量级标签，指向当前提交。
    *   `git tag -a <tag_name> -m "message"`：创建一个带注释的标签，可以添加描述信息。
    *   `git tag <tag_name> <commit>`：为指定的提交打上标签。
    *   `git tag`：列出所有标签。
    *   `git show <tag_name>`：查看标签信息。
    *   `git push origin <tag_name>`：将标签推送到远程仓库。
    *   `git push origin --tags`：将所有标签推送到远程仓库。
*   **示例：**

    ```bash
    # 创建一个轻量级标签，指向当前提交
    git tag v1.0

    # 创建一个带注释的标签，可以添加描述信息
    git tag -a v1.0 -m "Release version 1.0"

    # 为指定的提交打上标签
    git tag v0.9 a1b2c3d4

    # 列出所有标签
    git tag

    # 查看标签信息
    git show v1.0

    # 将标签推送到远程仓库
    git push origin v1.0

    # 将所有标签推送到远程仓库
    git push origin --tags
    ```

### 6. 忽略文件 (.gitignore)

*   **功能：** 指定 Git 忽略的文件或文件夹，这些文件不会被添加到版本控制中。
*   **用法：** 在项目根目录下创建一个名为 `.gitignore` 的文件，并在其中列出要忽略的文件或文件夹。
*   **示例：**

    ```
    # 忽略所有 .log 文件
    *.log

    # 忽略名为 "temp" 的文件夹
    temp/

    # 忽略 "config.ini" 文件
    config.ini

    # 忽略 "build" 文件夹下的所有内容
    build/*
    ```

*   **注意：**
    *   `.gitignore` 文件本身应该被添加到版本控制中。
    *   如果文件已经被 Git 管理，即使添加到 `.gitignore` 中也不会被忽略，需要先从 Git 中移除 (`git rm --cached <file>`)。

### 7. 子模块 (Submodule)

*   **功能：** 允许将一个 Git 仓库作为另一个 Git 仓库的子目录包含进来。
*   **用法：**
    *   `git submodule add <repository_url> <path>`：添加一个子模块。
    *   `git submodule init`：初始化子模块。
    *   `git submodule update`：更新子模块。
*   **示例：**

    ```bash
    # 添加一个子模块
    git submodule add https://github.com/example/my_library.git lib/my_library

    # 初始化子模块
    git submodule init

    # 更新子模块
    git submodule update
    ```

### 8. Blame

*   **功能:** 查看文件的每一行是由谁在哪个提交中修改的。
*   **指令:** `git blame <file>`
*   **示例:**

    ```bash
    git blame my_file.txt
    ```

### 9. Cherry-pick

*   **功能：** 选择一个提交，并将其应用到当前分支。 适用于将某个分支上的特定提交应用到另一个分支，而不需要合并整个分支。
*   **指令：** `git cherry-pick <commit_id>`
*   **示例：**

    ```bash
    # 将指定的提交应用到当前分支
    git cherry-pick a1b2c3d4
    ```

    *   **注意：**
        *   Cherry-pick 可能会导致冲突 (Conflict)，需要手动解决冲突，然后使用 `git add` 和 `git commit` 命令完成 cherry-pick。
        *   Cherry-pick 会创建一个新的提交，即使 cherry-pick 的内容与原始提交完全相同，新的提交的 commit id 也会不同。

### 10. Rebase (补充说明)

*   **功能：** 将一个分支的修改应用到另一个分支上，并修改提交历史。 **请谨慎使用 `git rebase`，因为它会修改提交历史。** (这里进行补充说明，因为 rebase 是比较高级且常用的操作)
*   **交互式 Rebase (Interactive Rebase):** `git rebase -i <commit>` 可以让你编辑一系列提交，例如合并、修改提交信息、删除提交等。 这是非常强大的功能，可以用来整理提交历史。
*   **示例：**

    ```bash
    # 切换到要变基的分支
    git checkout feature/my_feature

    # 交互式 rebase 到 main 分支的最新提交
    git rebase -i main
    ```

    在弹出的编辑器中，你可以修改提交的顺序、合并提交、修改提交信息等。

## 总结

本文介绍了 Git 最常用的功能和指令，从基本操作到进阶技巧。 掌握这些内容，你就可以更有效地进行版本控制、团队协作和代码管理。 Git 的功能非常强大，可以根据实际需要学习更高级的用法。

希望本文对你有所帮助！
