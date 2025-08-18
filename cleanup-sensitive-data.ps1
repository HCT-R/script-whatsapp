# Скрипт очистки чувствительных данных перед публикацией на GitHub
# Запускать ТОЛЬКО когда вы готовы опубликовать проект!

Write-Host "🔒 Очистка чувствительных данных для публикации на GitHub" -ForegroundColor Yellow
Write-Host "⚠️  ВНИМАНИЕ: Этот скрипт удалит все реальные данные!" -ForegroundColor Red
Write-Host ""

$confirmation = Read-Host "Вы уверены, что хотите продолжить? (y/N)"
if ($confirmation -ne "y" -and $confirmation -ne "Y") {
    Write-Host "❌ Операция отменена пользователем" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "🧹 Начинаю очистку..." -ForegroundColor Green

# Список файлов и папок для удаления
$sensitiveItems = @(
    "phone_numbers.xlsx",
    "grants_list.xlsx", 
    "test_numbers.txt",
    "uploads",
    "logs",
    ".env"
)

$deletedCount = 0
$errorCount = 0

foreach ($item in $sensitiveItems) {
    if (Test-Path $item) {
        try {
            if (Test-Path $item -PathType Container) {
                Remove-Item $item -Recurse -Force
                Write-Host "🗑️  Удалена папка: $item" -ForegroundColor Green
            } else {
                Remove-Item $item -Force
                Write-Host "🗑️  Удален файл: $item" -ForegroundColor Green
            }
            $deletedCount++
        } catch {
            Write-Host "❌ Ошибка при удалении $item : $($_.Exception.Message)" -ForegroundColor Red
            $errorCount++
        }
    } else {
        Write-Host "ℹ️  Файл/папка не найдены: $item" -ForegroundColor Blue
    }
}

Write-Host ""
Write-Host "📊 Результаты очистки:" -ForegroundColor Cyan
Write-Host "✅ Успешно удалено: $deletedCount" -ForegroundColor Green
Write-Host "❌ Ошибок: $errorCount" -ForegroundColor Red

# Проверка .gitignore
Write-Host ""
Write-Host "🔍 Проверка .gitignore..." -ForegroundColor Cyan

if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content ".gitignore" -Raw
    $requiredPatterns = @(
        "phone_numbers\.xlsx",
        "grants_list\.xlsx", 
        "test_numbers\.txt",
        "uploads/",
        "logs/",
        "\.env"
    )
    
    $missingPatterns = @()
    foreach ($pattern in $requiredPatterns) {
        if ($gitignoreContent -notmatch $pattern) {
            $missingPatterns += $pattern
        }
    }
    
    if ($missingPatterns.Count -eq 0) {
        Write-Host "✅ .gitignore настроен корректно" -ForegroundColor Green
    } else {
        Write-Host "⚠️  В .gitignore отсутствуют важные паттерны:" -ForegroundColor Yellow
        foreach ($pattern in $missingPatterns) {
            Write-Host "   - $pattern" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ Файл .gitignore не найден!" -ForegroundColor Red
}

# Проверка примеров файлов
Write-Host ""
Write-Host "🔍 Проверка примеров файлов..." -ForegroundColor Cyan

$exampleFiles = @(
    "phone_numbers.example.txt",
    "grants_list.example.xlsx",
    "env.example"
)

$examplesFound = 0
foreach ($file in $exampleFiles) {
    if (Test-Path $file) {
        Write-Host "✅ Найден пример: $file" -ForegroundColor Green
        $examplesFound++
    } else {
        Write-Host "❌ Отсутствует пример: $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📋 Чек-лист для публикации:" -ForegroundColor Yellow
Write-Host ""

if ($deletedCount -gt 0) {
    Write-Host "✅ Чувствительные данные удалены" -ForegroundColor Green
} else {
    Write-Host "❌ Чувствительные данные не были удалены" -ForegroundColor Red
}

if ($examplesFound -eq $exampleFiles.Count) {
    Write-Host "✅ Примеры файлов созданы" -ForegroundColor Green
} else {
    Write-Host "❌ Не все примеры файлов созданы" -ForegroundColor Red
}

if (Test-Path ".gitignore") {
    Write-Host "✅ .gitignore настроен" -ForegroundColor Green
} else {
    Write-Host "❌ .gitignore отсутствует" -ForegroundColor Red
}

Write-Host ""
Write-Host "🚀 Следующие шаги:" -ForegroundColor Cyan
Write-Host "1. Проверьте статус Git: git status" -ForegroundColor White
Write-Host "2. Добавьте файлы: git add ." -ForegroundColor White
Write-Host "3. Сделайте коммит: git commit -m 'Initial commit'" -ForegroundColor White
Write-Host "4. Отправьте на GitHub: git push origin main" -ForegroundColor White

Write-Host ""
Write-Host "🔒 Очистка завершена!" -ForegroundColor Green
Write-Host "Теперь проект готов к безопасной публикации на GitHub" -ForegroundColor Green
