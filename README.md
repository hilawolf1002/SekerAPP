<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SekerApp - לוח הבקרה</title>
    
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-WNRFLCEHLT"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-WNRFLCEHLT');
    </script>
    
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" crossorigin="anonymous">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary: #6366f1;
            --primary-dark: #4338ca;
            --secondary: #8b5cf6;
            --accent: #ec4899;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --dark: #0a0a0a;
            --gray: #64748b;
            --light: #ffffff;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0a0a0a;
            color: #ffffff;
            line-height: 1.7;
            overflow-x: hidden;
        }

        /* Enhanced Background */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
                linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
            z-index: -1;
        }

        /* Floating particles */
        .particles {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            pointer-events: none;
        }

        .particle {
            position: absolute;
            width: 3px;
            height: 3px;
            background: rgba(99, 102, 241, 0.4);
            border-radius: 50%;
            animation: float 8s ease-in-out infinite;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.4; }
            50% { transform: translateY(-30px) rotate(180deg); opacity: 0.8; }
        }

        /* Header */
        .header {
            background: rgba(10, 10, 10, 0.9);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding: 0 32px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 1000;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 16px;
            font-size: 24px;
            font-weight: 800;
            color: #ffffff;
            text-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
        }

        .logo i {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-size: 28px;
            filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.7));
        }

        .user-menu {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .user-info {
            display: flex;
            align-items: center;
            gap: 12px;
            color: #cbd5e1;
            font-size: 14px;
        }

        .user-avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 16px;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .logout-btn {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #cbd5e1;
            padding: 12px 20px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            gap: 8px;
            position: relative;
            overflow: hidden;
        }

        .logout-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.2), transparent);
            transition: left 0.6s;
        }

        .logout-btn:hover::before {
            left: 100%;
        }

        .logout-btn:hover {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            border-color: #ef4444;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
        }

        /* Layout */
        .app-layout {
            display: flex;
            min-height: calc(100vh - 80px);
        }

        /* Sidebar */
        .sidebar {
            width: 80px;
            background: rgba(10, 10, 10, 0.8);
            backdrop-filter: blur(20px);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            padding: 24px 0;
            transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .sidebar:hover {
            width: 300px;
        }

        .sidebar::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(180deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
            opacity: 0;
            transition: opacity 0.4s ease;
        }

        .sidebar:hover::before {
            opacity: 1;
        }

        .nav-section {
            margin-bottom: 32px;
        }

        .nav-title {
            font-size: 12px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0 24px 16px;
            opacity: 0;
            transition: opacity 0.4s ease;
            white-space: nowrap;
        }

        .sidebar:hover .nav-title {
            opacity: 1;
        }

        .nav-item {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            margin: 6px 16px;
            color: #cbd5e1;
            text-decoration: none;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 16px;
            position: relative;
            white-space: nowrap;
            overflow: hidden;
        }

        .nav-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.2), transparent);
            transition: left 0.6s;
        }

        .nav-item:hover::before {
            left: 100%;
        }

        .nav-item:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #ffffff;
            transform: translateX(-8px);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
        }

        .nav-item.active {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
            color: #ffffff;
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
            border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .nav-item.active::after {
            content: '';
            position: absolute;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 32px;
            background: linear-gradient(to bottom, #6366f1, #8b5cf6);
            border-radius: 2px;
            box-shadow: 0 0 10px rgba(99, 102, 241, 0.8);
        }

        .nav-item i {
            width: 24px;
            text-align: center;
            font-size: 18px;
            flex-shrink: 0;
        }

        .nav-text {
            opacity: 0;
            transition: opacity 0.4s ease;
            font-weight: 600;
        }

        .sidebar:hover .nav-text {
            opacity: 1;
        }

        .nav-tooltip {
            position: absolute;
            right: 70px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(15, 15, 30, 0.95);
            backdrop-filter: blur(10px);
            color: white;
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
            z-index: 1000;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .nav-tooltip::after {
            content: '';
            position: absolute;
            left: -6px;
            top: 50%;
            transform: translateY(-50%);
            border: 6px solid transparent;
            border-right-color: rgba(15, 15, 30, 0.95);
        }

        .sidebar:not(:hover) .nav-item:hover .nav-tooltip {
            opacity: 1;
        }

        /* Main Content */
        .main-content {
            flex: 1;
            padding: 40px;
            max-width: calc(100% - 80px);
            transition: max-width 0.4s ease;
        }

        .page-header {
            margin-bottom: 40px;
        }

        .page-title {
            font-size: 36px;
            font-weight: 800;
            background: linear-gradient(135deg, #ffffff, #a5b4fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 12px;
        }

        .page-subtitle {
            color: #cbd5e1;
            font-size: 18px;
        }

        /* Enhanced Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 28px;
            margin-bottom: 48px;
        }

        .stat-card {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
            backdrop-filter: blur(25px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 28px;
            padding: 40px;
            transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            cursor: pointer;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15));
            opacity: 0;
            transition: opacity 0.5s ease;
        }

        .stat-card::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
            transition: left 0.8s ease;
        }

        .stat-card:hover::before {
            opacity: 1;
        }

        .stat-card:hover::after {
            left: 100%;
        }

        .stat-card:hover {
            transform: translateY(-16px) scale(1.03);
            box-shadow: 0 30px 70px rgba(99, 102, 241, 0.5);
            border-color: rgba(99, 102, 241, 0.8);
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.05));
        }

        .stat-card:active {
            transform: translateY(-8px) scale(1.01);
        }

        .stat-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
            position: relative;
            z-index: 2;
        }

        .stat-title {
            color: #cbd5e1;
            font-size: 16px;
            font-weight: 600;
            transition: color 0.3s ease;
        }

        .stat-card:hover .stat-title {
            color: #ffffff;
        }

        .stat-icon {
            width: 64px;
            height: 64px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            box-shadow: 0 12px 35px rgba(0, 0, 0, 0.5);
            transition: all 0.5s ease;
            position: relative;
            overflow: hidden;
            border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .stat-icon::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .stat-card:hover .stat-icon::before {
            opacity: 1;
        }

        .stat-card:hover .stat-icon {
            transform: scale(1.15) rotate(8deg);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .stat-icon.surveys {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8, #1e40af);
            background-size: 200% 200%;
            animation: gradientShift 3s ease infinite;
            color: white;
        }

        .stat-icon.responses {
            background: linear-gradient(135deg, #10b981, #047857, #065f46);
            background-size: 200% 200%;
            animation: gradientShift 3s ease infinite 0.5s;
            color: white;
        }

        .stat-icon.completion {
            background: linear-gradient(135deg, #f59e0b, #d97706, #b45309);
            background-size: 200% 200%;
            animation: gradientShift 3s ease infinite 1s;
            color: white;
        }

        .stat-icon.recent {
            background: linear-gradient(135deg, #ec4899, #be185d, #9d174d);
            background-size: 200% 200%;
            animation: gradientShift 3s ease infinite 1.5s;
            color: white;
        }

        .stat-value {
            font-size: 42px;
            font-weight: 900;
            background: linear-gradient(135deg, #ffffff, #a5b4fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 12px;
            position: relative;
            z-index: 2;
            transition: all 0.3s ease;
        }

        .stat-card:hover .stat-value {
            transform: scale(1.05);
        }

        .stat-change {
            font-size: 14px;
            color: #10b981;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            position: relative;
            z-index: 2;
            padding: 8px 12px;
            background: rgba(16, 185, 129, 0.1);
            border-radius: 12px;
            border: 1px solid rgba(16, 185, 129, 0.2);
            transition: all 0.3s ease;
        }

        .stat-card:hover .stat-change {
            background: rgba(16, 185, 129, 0.2);
            border-color: rgba(16, 185, 129, 0.4);
            transform: translateX(4px);
        }

        /* Action Buttons */
        .actions-section {
            margin-bottom: 48px;
        }

        .section-title {
            font-size: 24px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 24px;
        }

        .actions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 24px;
        }

        .action-card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 32px 24px;
            text-align: center;
            text-decoration: none;
            color: inherit;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }

        .action-card:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(99, 102, 241, 0.5);
            transform: translateY(-8px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .action-card:active {
            transform: translateY(-4px);
        }

        .action-icon {
            width: 64px;
            height: 64px;
            border-radius: 20px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 28px;
            color: white;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            z-index: 2;
            box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
        }

        .action-card:hover .action-icon {
            transform: rotate(10deg) scale(1.1);
            box-shadow: 0 15px 40px rgba(99, 102, 241, 0.6);
        }

        .action-title {
            font-weight: 700;
            margin-bottom: 12px;
            color: #ffffff;
            transition: color 0.3s ease;
            position: relative;
            z-index: 2;
            font-size: 16px;
        }

        .action-description {
            font-size: 14px;
            color: #cbd5e1;
            transition: color 0.3s ease;
            position: relative;
            z-index: 2;
        }

        /* Content Grid */
        .content-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 40px;
        }

        /* Surveys List */
        .surveys-section {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            overflow: hidden;
        }

        .section-header {
            padding: 28px 32px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .view-all-btn {
            color: #6366f1;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            padding: 8px 16px;
            border-radius: 10px;
            background: rgba(99, 102, 241, 0.1);
            border: 1px solid rgba(99, 102, 241, 0.3);
            transition: all 0.3s ease;
        }

        .view-all-btn:hover {
            background: rgba(99, 102, 241, 0.2);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
        }

        .survey-item {
            padding: 24px 32px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .survey-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
            transition: left 0.6s;
        }

        .survey-item:hover::before {
            left: 100%;
        }

        .survey-item:hover {
            background: rgba(255, 255, 255, 0.05);
        }

        .survey-item:last-child {
            border-bottom: none;
        }

        .survey-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 12px;
            position: relative;
            z-index: 2;
        }

        .survey-title {
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 8px;
            font-size: 16px;
        }

        .survey-meta {
            font-size: 14px;
            color: #cbd5e1;
            margin-bottom: 8px;
        }

        .survey-details {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .category-badge {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            align-self: flex-start;
        }

        .phone-required-badge {
            display: inline-block;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            align-self: flex-start;
            margin-right: 8px;
        }

        .question-preview {
            font-size: 13px;
            color: #94a3b8;
            font-style: italic;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .survey-actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #cbd5e1;
        }

        .empty-state h3 {
            color: #ffffff;
            margin-bottom: 12px;
            font-size: 20px;
            font-weight: 600;
        }

        .empty-state p {
            margin-bottom: 24px;
            font-size: 16px;
            opacity: 0.8;
        }

        .empty-state .btn {
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 600;
        }

        .btn-icon {
            width: 40px;
            height: 40px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            font-size: 16px;
            color: #cbd5e1;
            position: relative;
            overflow: hidden;
        }

        .btn-icon::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s;
        }

        .btn-icon:hover::before {
            left: 100%;
        }

        .btn-icon:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
            border-color: rgba(99, 102, 241, 0.5);
        }

        .btn-icon.primary {
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: white;
            border-color: #6366f1;
        }

        .btn-icon.primary:hover {
            background: linear-gradient(135deg, #4f46e5, #4338ca);
            box-shadow: 0 10px 30px rgba(99, 102, 241, 0.5);
        }

        .btn-icon.export {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border-color: #10b981;
        }

        .btn-icon.export:hover {
            background: linear-gradient(135deg, #059669, #047857);
            box-shadow: 0 10px 30px rgba(16, 185, 129, 0.5);
        }

        .btn-icon.danger {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            border-color: #ef4444;
        }

        .btn-icon.danger:hover {
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            box-shadow: 0 10px 30px rgba(239, 68, 68, 0.5);
        }

        .btn-icon.info {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border-color: #10b981;
        }

        .btn-icon.info:hover {
            background: linear-gradient(135deg, #059669, #047857);
            box-shadow: 0 10px 30px rgba(16, 185, 129, 0.5);
        }

        .shared-survey {
            border-left: 4px solid #10b981;
        }

        .shared-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 12px;
        }

        .permissions-badge {
            display: inline-block;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 8px;
        }

        /* Analytics Panel */
        .analytics-panel {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            overflow: hidden;
            padding: 32px;
        }

        .survey-selector {
            margin-bottom: 24px;
        }

        .survey-selector label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #ffffff;
        }

        .survey-selector select {
            width: 100%;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            color: #ffffff;
            font-size: 14px;
            transition: all 0.3s ease;
        }

        .survey-selector select:focus {
            outline: none;
            border-color: #6366f1;
            background: rgba(255, 255, 255, 0.15);
        }

        /* Styling for dropdown options */
        .survey-selector select option {
            background-color: #1a1a2e;
            color: #ffffff;
            padding: 8px 12px;
        }

        .survey-selector select option:hover {
            background-color: #6366f1;
            color: #ffffff;
        }

        .survey-selector select option:checked {
            background-color: #4338ca;
            color: #ffffff;
        }

        .analytics-content {
            margin-top: 24px;
        }

        .analytics-header {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .analytics-header h4 {
            color: #ffffff;
            margin-bottom: 12px;
            font-size: 18px;
        }

        .analytics-stats {
            display: flex;
            gap: 24px;
            flex-wrap: wrap;
        }

        .stat-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #64748b;
            font-size: 14px;
        }

        .stat-item i {
            color: #6366f1;
        }

        .charts-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 32px;
        }

        /* Responsive design for mobile */
        @media (max-width: 768px) {
            .charts-grid {
                grid-template-columns: 1fr;
                gap: 16px;
            }
            
            .analytics-stats {
                flex-direction: column;
                gap: 12px;
            }
            
            .analytics-panel {
                padding: 20px;
            }
            
            .chart-container {
                padding: 16px;
            }
        }

        .chart-container {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 24px;
            text-align: center;
        }

        .chart-container h5 {
            color: #ffffff;
            margin-bottom: 16px;
            font-size: 16px;
        }

        .analytics-details {
            margin-bottom: 32px;
        }

        .analytics-details h5 {
            color: #ffffff;
            margin-bottom: 16px;
            font-size: 16px;
        }

        .answers-breakdown {
            display: grid;
            gap: 12px;
        }

        .answer-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .answer-text {
            color: #ffffff;
            font-weight: 500;
        }

        .answer-stats {
            display: flex;
            align-items: center;
            gap: 16px;
            color: #64748b;
            font-size: 14px;
        }

        .answer-percentage {
            color: #6366f1;
            font-weight: 600;
        }

        .analytics-placeholder {
            text-align: center;
            padding: 48px 24px;
            color: #64748b;
        }

        .analytics-placeholder h4 {
            color: #ffffff;
            margin-bottom: 12px;
            font-size: 18px;
        }

        .analytics-placeholder p {
            color: #64748b;
            font-size: 14px;
        }

        .export-section {
            padding: 24px 0;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .export-section h5 {
            color: #ffffff;
            margin-bottom: 16px;
            font-size: 16px;
        }

        .export-btn {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 12px;
            padding: 12px 20px;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            text-align: center;
            font-size: 14px;
            font-weight: 600;
            color: #10b981;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            position: relative;
            overflow: hidden;
            margin-right: 12px;
            margin-bottom: 8px;
        }

        .export-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.2), transparent);
            transition: left 0.6s;
        }

        .export-btn:hover::before {
            left: 100%;
        }

        .export-btn:hover {
            background: linear-gradient(135deg, #10b981, #059669);
            border-color: #10b981;
            color: white;
            transform: translateY(-3px);
            box-shadow: 0 12px 35px rgba(16, 185, 129, 0.4);
        }



        /* Status Badge */
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 600;
            backdrop-filter: blur(10px);
        }

        .status-badge.active {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .status-badge.completed {
            background: rgba(99, 102, 241, 0.2);
            color: #6366f1;
            border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .status-badge.draft {
            background: rgba(245, 158, 11, 0.2);
            color: #f59e0b;
            border: 1px solid rgba(245, 158, 11, 0.3);
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
            .content-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 768px) {
            .app-layout {
                flex-direction: column;
            }
            
            .sidebar {
                width: 100%;
                height: 70px;
                border-left: none;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                align-items: center;
                padding: 0 20px;
                overflow-x: auto;
            }
            
            .sidebar:hover {
                width: 100%;
                height: 70px;
            }
            
            .nav-section {
                display: flex;
                margin-bottom: 0;
                margin-left: 20px;
            }
            
            .nav-title {
                display: none;
            }
            
            .nav-item {
                margin: 0 6px;
                padding: 12px;
                min-width: 48px;
                justify-content: center;
            }
            
            .nav-text {
                display: none;
            }
            
            .nav-tooltip {
                display: none;
            }
            
            .main-content {
                max-width: 100%;
                padding: 24px;
            }
            
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
            }
            
            .actions-grid {
                grid-template-columns: 1fr;
            }

            /* Enhanced mobile stats */
            .stat-card {
                padding: 24px;
                border-radius: 20px;
            }

            .stat-value {
                font-size: 32px;
            }

            .stat-icon {
                width: 48px;
                height: 48px;
                font-size: 18px;
            }

            .stat-title {
                font-size: 14px;
            }

            .stat-change {
                font-size: 12px;
                padding: 6px 10px;
            }
        }

        @media (max-width: 480px) {
            .header {
                padding: 0 20px;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
                gap: 16px;
            }
            
            .survey-header {
                flex-direction: column;
                gap: 16px;
            }
            
            .survey-actions {
                justify-content: flex-start;
            }

            /* Ultra mobile stats */
            .stat-card {
                padding: 20px;
                border-radius: 18px;
            }

            .stat-value {
                font-size: 28px;
            }

            .stat-icon {
                width: 44px;
                height: 44px;
                font-size: 16px;
            }

            .stat-title {
                font-size: 13px;
            }

            .stat-change {
                font-size: 11px;
                padding: 5px 8px;
            }

            .page-title {
                font-size: 28px;
            }

            .page-subtitle {
                font-size: 16px;
            }
        }

        /* Loading animations */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .fade-in-up {
            animation: fadeInUp 0.6s ease-out;
        }

        /* Loading state for stats */
        .stat-card.loading {
            position: relative;
            overflow: hidden;
        }

        .stat-card.loading::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            animation: loadingShimmer 1.5s infinite;
        }

        @keyframes loadingShimmer {
            0% {
                left: -100%;
            }
            100% {
                left: 100%;
            }
        }

        .stat-card.loading .stat-value {
            background: linear-gradient(90deg, #64748b, #94a3b8, #64748b);
            background-size: 200% 100%;
            animation: loadingPulse 1.5s ease-in-out infinite;
        }

        @keyframes loadingPulse {
            0%, 100% {
                opacity: 0.6;
            }
            50% {
                opacity: 1;
            }
        }

        /* Success state for stats */
        .stat-card.success {
            border-color: rgba(16, 185, 129, 0.5);
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
        }

        .stat-card.success .stat-icon {
            animation: successBounce 0.6s ease-out;
        }

        @keyframes successBounce {
            0% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.2);
            }
            100% {
                transform: scale(1.1);
            }
        }

        /* Error state for stats */
        .stat-card.error {
            border-color: rgba(239, 68, 68, 0.5);
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
        }

        .stat-card.error .stat-icon {
            background: linear-gradient(135deg, #ef4444, #dc2626, #b91c1c) !important;
        }

        .stat-card.error .stat-change {
            color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.2);
        }

        /* Scroll indicator */
        .scroll-indicator {
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);
            z-index: 9999;
            transition: width 0.3s ease;
        }

        /* Modal Styles */
        .modal {
            display: none;
            position: fixed;
            z-index: 10000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.6);
            padding-top: 60px;
        }

        .modal.show {
            display: block;
        }

        .modal.hidden {
            display: none !important;
        }

        .modal:not(.hidden) {
            display: block !important;
        }
        
        /* Special handling for edit modal */
        #surveyEditModal.show {
            display: flex !important;
        }
        
        /* Override general modal styles for edit modal */
        #surveyEditModal {
            display: none !important;
        }
        
        #surveyEditModal.show {
            display: flex !important;
        }

        .modal-content {
            background-color: #1a1a2e;
            margin: 5% auto;
            padding: 30px;
            border-radius: 20px;
            width: 90%;
            max-width: 600px;
            position: relative;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-header h2 {
            font-size: 24px;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
        }

        .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            color: #cbd5e1;
            cursor: pointer;
            transition: color 0.3s ease;
        }

        .close-btn:hover {
            color: #ef4444;
        }

        .survey-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
        }

        .form-group label {
            font-size: 14px;
            font-weight: 600;
            color: #cbd5e1;
            margin-bottom: 8px;
            text-transform: capitalize;
        }

        .form-group input[type="text"],
        .form-group input[type="file"],
        .form-group select,
        .form-group textarea {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 12px 16px;
            color: #ffffff;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
        }

        .form-group input[type="text"]:focus,
        .form-group input[type="file"]:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
            transform: translateY(-1px);
        }

        .form-group input[type="text"],
        .form-group input[type="file"],
        .form-group select,
        .form-group textarea {
            position: relative;
            overflow: hidden;
        }

        .form-group input[type="text"]::after,
        .form-group input[type="file"]::after,
        .form-group select::after,
        .form-group textarea::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 0;
            height: 2px;
            background: linear-gradient(90deg, #6366f1, #4f46e5);
            transition: width 0.3s ease;
        }

        .form-group input[type="text"]:focus::after,
        .form-group input[type="file"]:focus::after,
        .form-group select:focus::after,
        .form-group textarea:focus::after {
            width: 100%;
        }

        .form-group input[type="file"] {
            padding: 12px 16px;
            cursor: pointer;
        }

        .form-group select {
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='feather feather-chevron-down'%3E%3Cpath d='M3 5l3 3 3-3'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 15px center;
            background-size: 12px;
            padding-right: 40px;
            color: #ffffff;
            font-weight: 500;
        }

        .form-group select option {
            background: #1e293b;
            color: #ffffff;
            padding: 12px;
            font-weight: 500;
        }

        .form-group select option:hover {
            background: #334155;
        }

        .form-group textarea {
            min-height: 100px;
            resize: vertical;
            padding-top: 12px;
            padding-bottom: 12px;
        }

        .form-help {
            display: block;
            margin-top: 8px;
            font-size: 12px;
            color: #94a3b8;
            font-style: italic;
            line-height: 1.4;
        }

        .checkbox-label {
            display: flex;
            align-items: center;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            color: #cbd5e1;
            margin-bottom: 8px;
        }

        .checkbox-label input[type="checkbox"] {
            margin-right: 12px;
            width: 18px;
            height: 18px;
            accent-color: #6366f1;
            cursor: pointer;
        }

        .checkbox-label .checkmark {
            margin-right: 8px;
        }

        .image-upload {
            position: relative;
            width: 100%;
            height: 150px;
            border: 2px dashed rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.05);
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .image-upload:hover {
            border-color: #6366f1;
            background: rgba(99, 102, 241, 0.1);
        }

        .upload-placeholder {
            text-align: center;
            color: #cbd5e1;
            font-size: 14px;
            font-weight: 600;
        }

        .image-preview {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 16px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .image-preview.show {
            opacity: 1;
        }

        .answer-input {
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 12px 16px;
            color: #ffffff;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
        }

        .answer-input:focus-within {
            border-color: #6366f1;
            box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
        }

        .answer-input input {
            flex-grow: 1;
            background: none;
            border: none;
            color: #ffffff;
            font-size: 14px;
            font-weight: 500;
            padding: 0;
        }

        .answer-input input:focus {
            outline: none;
        }

        .remove-answer {
            background: none;
            border: none;
            color: #ef4444;
            cursor: pointer;
            font-size: 18px;
            padding: 5px;
            transition: color 0.3s ease;
        }

        .remove-answer:hover {
            color: #dc2626;
        }

        .add-answer-btn {
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            border: none;
            border-radius: 12px;
            padding: 12px 20px;
            color: white;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
            position: relative;
            overflow: hidden;
        }

        .add-answer-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.6s;
        }

        .add-answer-btn:hover::before {
            left: 100%;
        }

        .add-answer-btn:hover {
            background: linear-gradient(135deg, #4f46e5, #4338ca);
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
        }

        .add-answer-btn:active {
            transform: translateY(0) scale(0.98);
        }

        .form-actions {
            display: flex;
            justify-content: space-between;
            gap: 10px;
        }

        .form-actions .btn {
            flex: 1;
            text-align: center;
            padding: 14px 24px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .form-actions .btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            transition: left 0.5s;
        }

        .form-actions .btn:hover::before {
            left: 100%;
        }

        .form-actions .btn.primary {
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            border: none;
            color: white;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }

        .form-actions .btn.primary:hover {
            background: linear-gradient(135deg, #4f46e5, #4338ca);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
        }

        .form-actions .btn.secondary {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #cbd5e1;
        }

        .form-actions .btn.secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-1px);
        }

        .success-icon {
            text-align: center;
            margin-bottom: 15px;
        }

        .success-icon i {
            font-size: 60px;
            color: #10b981;
        }

        .success .modal-content {
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border: 1px solid rgba(16, 185, 129, 0.3);
            box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        }

        .success .modal-header {
            border-bottom: 1px solid rgba(16, 185, 129, 0.2);
        }

        .success .modal-header h2 {
            color: #10b981;
        }

        .success .success-icon i {
            color: #10b981;
        }

        .success-actions {
            display: flex;
            justify-content: space-around;
            gap: 10px;
        }

        .success-actions .btn {
            flex: 1;
            text-align: center;
        }

        .hidden {
            display: none !important;
        }

        /* Special styling for Create Survey button */
        .create-survey-btn {
            position: relative;
            overflow: hidden;
            background: linear-gradient(135deg, #8b5cf6, #6366f1, #4f46e5);
            background-size: 200% 200%;
            animation: gradientShift 3s ease infinite;
            border: none;
            padding: 16px 32px;
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            border-radius: 16px;
            box-shadow: 
                0 8px 25px rgba(139, 92, 246, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.1);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .create-survey-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transition: left 0.8s;
        }

        .create-survey-btn:hover::before {
            left: 100%;
        }

        .create-survey-btn:hover {
            transform: translateY(-4px) scale(1.05);
            box-shadow: 
                0 12px 35px rgba(139, 92, 246, 0.6),
                0 0 0 2px rgba(255, 255, 255, 0.2);
            background-size: 150% 150%;
        }

        .create-survey-btn:active {
            transform: translateY(-2px) scale(1.02);
        }

        .create-survey-btn .btn-glow {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .create-survey-btn:hover .btn-glow {
            opacity: 1;
        }

        @keyframes gradientShift {
            0%, 100% {
                background-position: 0% 50%;
            }
            50% {
                background-position: 100% 50%;
            }
        }

        @keyframes statPulse {
            0%, 100% {
                transform: scale(1);
                opacity: 1;
            }
            50% {
                transform: scale(1.05);
                opacity: 0.8;
            }
        }

        @keyframes statFloat {
            0%, 100% {
                transform: translateY(0px);
            }
            50% {
                transform: translateY(-5px);
            }
        }
    </style>
</head>
<body>
    <!-- Scroll Progress Indicator -->
    <div class="scroll-indicator" id="scrollIndicator"></div>

    <!-- Floating Particles -->
    <div class="particles" id="particles"></div>

    <header class="header">
                            <div class="logo">
            <img src="logo.png" alt="SekerApp Logo" style="height: 40px; width: auto;">
            SekerApp
        </div>
        <div class="user-menu">
            <div class="user-info">
                <span id="userName">טוען...</span>
            </div>
            <div class="user-avatar" id="userAvatar">ט</div>
            <button class="logout-btn" id="logoutBtn">
                <i class="fas fa-sign-out-alt"></i>
                התנתק
            </button>
        </div>
    </header>

    <div class="app-layout">
        <nav class="sidebar">
            <div class="nav-section">
                <div class="nav-title">ראשי</div>
                <a href="#" class="nav-item active">
                    <i class="fas fa-home"></i>
                    <span class="nav-text">דשבורד</span>
                    <div class="nav-tooltip">דשבורד</div>
                </a>
                <a href="#" class="nav-item">
                    <i class="fas fa-chart-bar"></i>
                    <span class="nav-text">אנליטיקה</span>
                    <div class="nav-tooltip">אנליטיקה</div>
                </a>
            </div>
            
            <div class="nav-section">
                <div class="nav-title">סקרים</div>
                <a href="#" class="nav-item">
                    <i class="fas fa-plus"></i>
                    <span class="nav-text">יצירת סקר חדש</span>
                    <div class="nav-tooltip">יצירת סקר חדש</div>
                </a>
                <a href="#" class="nav-item">
                    <i class="fas fa-list"></i>
                    <span class="nav-text">כל הסקרים</span>
                    <div class="nav-tooltip">כל הסקרים</div>
                </a>
                <a href="#" class="nav-item">
                    <i class="fas fa-archive"></i>
                    <span class="nav-text">סקרים מאורכבים</span>
                    <div class="nav-tooltip">סקרים מאורכבים</div>
                </a>
            </div>
            
            <div class="nav-section">
                <div class="nav-title">כלים</div>
                <a href="#" class="nav-item">
                    <i class="fas fa-file-excel"></i>
                    <span class="nav-text">ייצוא לאקסל</span>
                    <div class="nav-tooltip">ייצוא לאקסל</div>
                </a>
                <a href="#" class="nav-item">
                    <i class="fas fa-share-alt"></i>
                    <span class="nav-text">שיתוף</span>
                    <div class="nav-tooltip">שיתוף</div>
                </a>
                <a href="#" class="nav-item">
                    <i class="fas fa-cog"></i>
                    <span class="nav-text">הגדרות</span>
                    <div class="nav-tooltip">הגדרות</div>
                </a>
            </div>
        </nav>

        <main class="main-content">
            <div class="page-header fade-in-up">
                <h1 class="page-title">ברוך הבא בחזרה!</h1>
                <p class="page-subtitle">הנה סקירה של הפעילות שלך השבוע עם תובנות מתקדמות</p>
            </div>

            <div class="stats-grid fade-in-up">
                <div class="stat-card" data-stat="surveys">
                    <div class="stat-header">
                        <span class="stat-title">סקרים פעילים</span>
                        <div class="stat-icon surveys">
                            <i class="fas fa-poll"></i>
                        </div>
                    </div>
                    <div class="stat-value">0</div>
                    <div class="stat-change">
                        <i class="fas fa-spinner fa-spin"></i>
                        טוען...
                    </div>
                </div>

                <div class="stat-card" data-stat="responses">
                    <div class="stat-header">
                        <span class="stat-title">סה״כ תשובות</span>
                        <div class="stat-icon responses">
                            <i class="fas fa-users"></i>
                        </div>
                    </div>
                    <div class="stat-value">0</div>
                    <div class="stat-change">
                        <i class="fas fa-spinner fa-spin"></i>
                        טוען...
                    </div>
                </div>

                <div class="stat-card" data-stat="completion">
                    <div class="stat-header">
                        <span class="stat-title">שיעור השלמה</span>
                        <div class="stat-icon completion">
                            <i class="fas fa-percentage"></i>
                        </div>
                    </div>
                    <div class="stat-value">0%</div>
                    <div class="stat-change">
                        <i class="fas fa-spinner fa-spin"></i>
                        טוען...
                    </div>
                </div>

                <div class="stat-card" data-stat="recent">
                    <div class="stat-header">
                        <span class="stat-title">תשובות השבוע</span>
                        <div class="stat-icon recent">
                            <i class="fas fa-calendar-week"></i>
                        </div>
                    </div>
                    <div class="stat-value">0</div>
                    <div class="stat-change">
                        <i class="fas fa-spinner fa-spin"></i>
                        טוען...
                    </div>
                </div>
            </div>

            <div class="actions-section fade-in-up">
                <h2 class="section-title">פעולות מהירות</h2>
                <div class="actions-grid">
                    <div class="action-card" id="createSurveyAction">
                        <div class="action-icon">
                            <i class="fas fa-plus"></i>
                        </div>
                        <div class="action-title">צור סקר חדש</div>
                        <div class="action-description">התחל בבניית סקר חדש</div>
                    </div>
                    
                    <div class="action-card">
                        <div class="action-icon">
                            <i class="fas fa-copy"></i>
                        </div>
                        <div class="action-title">שכפל סקר</div>
                        <div class="action-description">העתק סקר קיים וערוך</div>
                    </div>
                    
                    <div class="action-card">
                        <div class="action-icon">
                            <i class="fas fa-share"></i>
                        </div>
                        <div class="action-title">שתף סקר</div>
                        <div class="action-description">שלח לינק מאובטח לסקר</div>
                    </div>
                    
                    <div class="action-card">
                        <div class="action-icon">
                            <i class="fas fa-file-excel"></i>
                        </div>
                        <div class="action-title">ייצא לאקסל</div>
                        <div class="action-description">הורד תוצאות מתקדמות</div>
                    </div>
                </div>
            </div>

            <div class="content-grid fade-in-up">
                                    <div class="surveys-section">
                        <div class="section-header">
                            <h3 class="section-title">הסקרים שלך</h3>
                            <div class="header-actions">
                                <button class="btn primary create-survey-btn" id="createSurveyBtn">
                                    <i class="fas fa-plus"></i>
                                    <span>צור סקר חדש</span>
                                    <div class="btn-glow"></div>
                                </button>
                            </div>
                        </div>
                    
                    <div class="surveys-list">
                        <div class="empty-state">
                            <i class="fas fa-clipboard-list" style="font-size: 48px; color: #6366f1; margin-bottom: 16px;"></i>
                            <h3>אין לך סקרים עדיין</h3>
                            <p>בואו נתחיל ליצור סקר ראשון!</p>
                            <button class="btn primary create-survey-btn" onclick="window.openSurveyModal()">
                                <i class="fas fa-plus"></i>
                                <span>צור סקר חדש</span>
                                <div class="btn-glow"></div>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="analytics-panel">
                    <div class="section-header">
                        <h3 class="section-title">אנליטיקה מתקדמת</h3>
                    </div>
                    
                    <div class="survey-selector">
                        <label for="surveySelect">בחר סקר לניתוח:</label>
                        <select id="surveySelect" onchange="loadSurveyAnalytics()">
                            <option value="">בחר סקר מהרשימה</option>
                        </select>
                    </div>
                    
                    <div id="analyticsContent" class="analytics-content" style="display: none;">
                        <div class="analytics-header">
                            <h4 id="selectedSurveyTitle"></h4>
                            <div class="analytics-stats">
                                <span class="stat-item">
                                    <i class="fas fa-users"></i>
                                    <span id="totalResponses">0</span> תשובות
                                </span>
                                <span class="stat-item">
                                    <i class="fas fa-calendar"></i>
                                    <span id="surveyDate">תאריך לא ידוע</span>
                                </span>
                            </div>
                        </div>
                        
                        <div class="charts-grid">
                            <div class="chart-container">
                                <h5>התפלגות תשובות</h5>
                                <canvas id="pieChart" width="300" height="300"></canvas>
                            </div>
                            
                            <div class="chart-container">
                                <h5>תשובות לאורך זמן</h5>
                                <canvas id="lineChart" width="300" height="300"></canvas>
                            </div>
                        </div>
                        
                        <div class="analytics-details">
                            <h5>פירוט תשובות</h5>
                            <div id="answersBreakdown" class="answers-breakdown"></div>
                        </div>
                        
                        <div class="export-section">
                            <h5>ייצוא נתונים</h5>
                            <button class="export-btn" onclick="exportSurveyData()">
                                <i class="fas fa-file-excel"></i>
                                ייצא לאקסל
                            </button>
                            <button class="export-btn" onclick="exportSurveyPDF()">
                                <i class="fas fa-file-pdf"></i>
                                ייצא ל-PDF
                            </button>
                        </div>
                    </div>
                    
                    <div id="analyticsPlaceholder" class="analytics-placeholder">
                        <i class="fas fa-chart-line" style="font-size: 48px; color: #6366f1; margin-bottom: 16px;"></i>
                        <h4>בחר סקר כדי לראות אנליטיקה מתקדמת</h4>
                        <p>הנתונים יוצגו בגרפים אינטראקטיביים עם ניתוח מפורט</p>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Survey Creation Modal -->
    <div id="surveyModal" class="modal hidden">
        <div class="modal-content">
            <div class="modal-header">
                <h2>צור סקר חדש</h2>
                <button class="close-btn" id="closeSurveyModalBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
    <!-- Survey Edit Modal -->
    <div id="surveyEditModal" class="modal hidden" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h2>ערוך סקר</h2>
                <button class="close-btn" id="closeSurveyEditModalBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <form id="surveyEditForm" class="survey-form" enctype="multipart/form-data">
                <input type="hidden" id="editSurveyId" name="surveyId">
                
                <div class="form-group">
                    <label for="editSurveyTitle">כותרת הסקר *</label>
                    <input type="text" id="editSurveyTitle" name="title" required placeholder="הכנס כותרת לסקר">
                </div>
                
                <div class="form-group">
                    <label for="editSurveyDescription">תיאור הסקר</label>
                    <textarea id="editSurveyDescription" name="description" placeholder="תיאור קצר של הסקר"></textarea>
                </div>
                
                <div class="form-group">
                    <label for="editSurveyCategory">קטגוריית הסקר *</label>
                    <select id="editSurveyCategory" name="category" required>
                        <option value="">בחר קטגוריה</option>
                        <option value="פוליטי">פוליטי</option>
                        <option value="מוניציפאלי">מוניציפאלי</option>
                        <option value="חברתי">חברתי</option>
                        <option value="עסקי">עסקי</option>
                        <option value="מחאתי">מחאתי</option>
                        <option value="סתם כדי לדעת">סתם כדי לדעת</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="editSurveyImage">תמונת הסקר</label>
                    <div class="image-upload">
                        <input type="file" id="editSurveyImage" name="image" accept="image/*">
                        <div class="upload-placeholder" id="editUploadPlaceholder">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <span>לחץ לבחירת תמונה</span>
                        </div>
                        <img id="editImagePreview" class="image-preview hidden" alt="תמונה מקדימה">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="editThankYouMessage">הודעת תודה (אופציונלי)</label>
                    <textarea id="editThankYouMessage" name="thankYouMessage" placeholder="הכנס הודעת תודה מותאמת אישית. אם לא תזין כלום, תוצג הודעת ברירת מחדל." rows="3"></textarea>
                    <small class="form-help">אם השדה ריק, תוצג ההודעה: "תודה על התשובה שלך! התשובה שלך נשמרה בהצלחה"</small>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="editRequirePhone" name="requirePhone">
                        <span class="checkmark"></span>
                        בקש טלפון
                    </label>
                    <small class="form-help">אם תסמן את האפשרות הזו, המשתמשים יצטרכו להזין מספר טלפון לפני שיוכלו להשתתף בסקר</small>
                </div>
                
                <div class="form-group">
                    <label>שאלת הסקר *</label>
                    <input type="text" id="editSurveyQuestion" name="question" required placeholder="הכנס את השאלה">
                </div>
                
                <div class="form-group">
                    <label>תשובות הסקר *</label>
                    <div id="editAnswersContainer">
                        <div class="answer-input">
                            <input type="text" name="answers" required placeholder="תשובה 1">
                            <button type="button" class="remove-answer" style="display: none;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div class="answer-input">
                            <input type="text" name="answers" required placeholder="תשובה 2">
                            <button type="button" class="remove-answer" style="display: none;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <button type="button" class="add-answer-btn" id="editAddAnswerBtn">
                        <i class="fas fa-plus"></i>
                        הוסף תשובה חדשה
                    </button>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn secondary" id="cancelSurveyEditBtn">ביטול</button>
                    <button type="submit" class="btn primary">
                        <i class="fas fa-save"></i>
                        שמור שינויים
                    </button>
                </div>
            </form>
        </div>
    </div>
            
            <form id="surveyForm" class="survey-form" enctype="multipart/form-data">
                <div class="form-group">
                    <label for="surveyTitle">כותרת הסקר *</label>
                    <input type="text" id="surveyTitle" name="title" required placeholder="הכנס כותרת לסקר">
                </div>
                
                <div class="form-group">
                    <label for="surveyDescription">תיאור הסקר</label>
                    <textarea id="surveyDescription" name="description" placeholder="תיאור קצר של הסקר"></textarea>
                </div>
                
                <div class="form-group">
                    <label for="surveyCategory">קטגוריית הסקר *</label>
                    <select id="surveyCategory" name="category" required>
                        <option value="">בחר קטגוריה</option>
                        <option value="פוליטי">פוליטי</option>
                        <option value="מוניציפאלי">מוניציפאלי</option>
                        <option value="חברתי">חברתי</option>
                        <option value="עסקי">עסקי</option>
                        <option value="מחאתי">מחאתי</option>
                        <option value="סתם כדי לדעת">סתם כדי לדעת</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="surveyImage">תמונת הסקר</label>
                    <div class="image-upload">
                        <input type="file" id="surveyImage" name="image" accept="image/*">
                        <div class="upload-placeholder" id="uploadPlaceholder">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <span>לחץ לבחירת תמונה</span>
                        </div>
                        <img id="imagePreview" class="image-preview hidden" alt="תמונה מקדימה">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="thankYouMessage">הודעת תודה (אופציונלי)</label>
                    <textarea id="thankYouMessage" name="thankYouMessage" placeholder="הכנס הודעת תודה מותאמת אישית. אם לא תזין כלום, תוצג הודעת ברירת מחדל." rows="3"></textarea>
                    <small class="form-help">אם השדה ריק, תוצג ההודעה: "תודה על התשובה שלך! התשובה שלך נשמרה בהצלחה"</small>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="requirePhone" name="requirePhone">
                        <span class="checkmark"></span>
                        בקש טלפון
                    </label>
                    <small class="form-help">אם תסמן את האפשרות הזו, המשתמשים יצטרכו להזין מספר טלפון לפני שיוכלו להשתתף בסקר</small>
                </div>
                
                <div class="form-group">
                    <label>שאלת הסקר *</label>
                    <input type="text" id="surveyQuestion" name="question" required placeholder="הכנס את השאלה">
                </div>
                
                <div class="form-group">
                    <label>תשובות הסקר *</label>
                    <div id="answersContainer">
                        <div class="answer-input">
                            <input type="text" name="answers" required placeholder="תשובה 1">
                            <button type="button" class="remove-answer" style="display: none;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div class="answer-input">
                            <input type="text" name="answers" required placeholder="תשובה 2">
                            <button type="button" class="remove-answer" style="display: none;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <button type="button" class="add-answer-btn" id="addAnswerBtn">
                        <i class="fas fa-plus"></i>
                        הוסף תשובה חדשה
                    </button>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn secondary" id="cancelSurveyBtn">ביטול</button>
                    <button type="submit" class="btn primary">
                        <i class="fas fa-plus"></i>
                        צור סקר
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Success Modal -->
    <div id="successModal" class="modal hidden">
        <div class="modal-content success">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h2>הסקר נוצר בהצלחה!</h2>
            <p>הסקר שלך זמין כעת לציבור הרחב</p>
            <div class="success-actions">
                <button class="btn primary" id="openSurveyBtn">
                    <i class="fas fa-external-link-alt"></i>
                    פתח עמוד סקר
                </button>
                <button class="btn secondary" id="closeSuccessBtn">
                    סגור
                </button>
            </div>
        </div>
    </div>

    <script>
        // Enhanced UI interactions with modern effects
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM Content Loaded - Setting up event listeners...');
            
            // Track dashboard page view
            gtag('event', 'dashboard_view', {
                'event_category': 'user_interaction',
                'event_label': 'dashboard_page_load'
            });
            
            // Create floating particles
            createParticles();
            
            // Scroll progress indicator
            updateScrollIndicator();
            
            // Navigation interactions
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    navItems.forEach(nav => nav.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Add ripple effect
                    createRipple(e, this);
                    
                    // Handle navigation based on text content
                    const navText = this.querySelector('.nav-text').textContent;
                    handleNavigation(navText);
                });
            });

            // Navigation handler function
            function handleNavigation(navText) {
                switch(navText) {
                    case 'דשבורד':
                        showDashboard();
                        break;
                    case 'אנליטיקה':
                        showAnalytics();
                        break;
                    case 'יצירת סקר חדש':
                        openSurveyModal();
                        break;
                    case 'כל הסקרים':
                        showAllSurveys();
                        break;
                    case 'סקרים מאורכבים':
                        showArchivedSurveys();
                        break;
                    case 'ייצוא לאקסל':
                        showExportOptions();
                        break;
                    case 'שיתוף':
                        showSharingOptions();
                        break;
                    case 'הגדרות':
                        showSettings();
                        break;
                }
            }

            // Action cards with enhanced interactions (excluding create survey)
            const actionCards = document.querySelectorAll('.action-card:not(#createSurveyAction)');
            actionCards.forEach(card => {
                card.addEventListener('click', function(e) {
                    e.preventDefault();
                    const title = this.querySelector('.action-title').textContent;
                    
                    // Add click animation
                    this.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        this.style.transform = '';
                        window.showNotification(`פעולה: ${title}`, 'זהו דמו עם עיצוב מתקדם');
                    }, 150);
                });

                // Mouse move effect
                card.addEventListener('mousemove', function(e) {
                    const rect = this.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    
                    const rotateX = (y - centerY) / 10;
                    const rotateY = (centerX - x) / 10;
                    
                    this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px) scale(1.02)`;
                });

                card.addEventListener('mouseleave', function() {
                    this.style.transform = '';
                });
            });

            // Survey action buttons
            const surveyButtons = document.querySelectorAll('.btn-icon');
            surveyButtons.forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const title = this.getAttribute('title');
                    
                    // Add pulse effect
                    this.style.animation = 'pulse 0.3s ease';
                    setTimeout(() => {
                        this.style.animation = '';
                        window.showNotification(`פעולה: ${title}`, 'זהו דמו מתקדם');
                    }, 300);
                });
            });

            // Export functionality
            const exportSurveyButtons = document.querySelectorAll('.export-survey');
            exportSurveyButtons.forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const surveyId = this.getAttribute('data-survey');
                    const surveyTitle = this.closest('.survey-item').querySelector('.survey-title').textContent;
                    window.showNotification(`ייצוא "${surveyTitle}"`, 'הדוח מוכן להורדה!');
                });
            });

            // General export button
            const generalExportBtn = document.querySelector('.export-section .export-btn');
            if (generalExportBtn) {
                generalExportBtn.addEventListener('click', function() {
                    window.showNotification('ייצוא כללי', 'דוח מקיף מוכן להורדה!');
                });
            }

            // Logout with confirmation
            const logoutBtn = document.querySelector('.logout-btn');
            logoutBtn.addEventListener('click', function() {
                window.showNotification('התנתקות', 'מתנתק מהמערכת...');
            });

            // Enhanced stats cards interactions
            const statCards = document.querySelectorAll('.stat-card');
            statCards.forEach((card, index) => {
                // Add click effect
                card.addEventListener('click', function() {
                    // Add ripple effect
                    createRipple(event, this);
                    
                    // Show detailed info
                    const statTitle = this.querySelector('.stat-title').textContent;
                    const statValue = this.querySelector('.stat-value').textContent;
                    
                    showNotification(
                        statTitle,
                        `ערך נוכחי: ${statValue}`
                    );
                    
                    // Add pulse animation
                    this.style.animation = 'statPulse 0.6s ease';
                    setTimeout(() => {
                        this.style.animation = '';
                    }, 600);
                });

                // Enhanced hover effects
                card.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-12px) scale(1.02)';
                    this.style.boxShadow = '0 25px 60px rgba(99, 102, 241, 0.4)';
                    
                    // Add floating animation to icon
                    const icon = this.querySelector('.stat-icon');
                    if (icon) {
                        icon.style.animation = 'statFloat 2s ease-in-out infinite';
                    }
                });
                
                card.addEventListener('mouseleave', function() {
                    this.style.transform = '';
                    this.style.boxShadow = '';
                    
                    // Remove floating animation
                    const icon = this.querySelector('.stat-icon');
                    if (icon) {
                        icon.style.animation = '';
                    }
                });

                // Add staggered entrance animation
                card.style.opacity = '0';
                card.style.transform = 'translateY(30px)';
                
                setTimeout(() => {
                    card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 150);
            });

            // Survey creation modal
            const createSurveyAction = document.getElementById('createSurveyAction');
            if (createSurveyAction) {
                createSurveyAction.addEventListener('click', function(e) {
                    e.preventDefault();
                    console.log('Create survey action clicked');
                    window.openSurveyModal();
                });
            } else {
                console.error('Create survey action element not found');
            }

            // Create survey button in surveys section
            const createSurveyBtn = document.getElementById('createSurveyBtn');
            if (createSurveyBtn) {
                createSurveyBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    console.log('Create survey button clicked');
                    window.openSurveyModal();
                });
            } else {
                console.error('Create survey button element not found');
            }

                    // Survey form submission
        const surveyForm = document.getElementById('surveyForm');
        if (surveyForm) {
            surveyForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Track survey creation attempt
                gtag('event', 'survey_creation_attempt', {
                    'event_category': 'survey_creation',
                    'event_label': 'form_submitted'
                });
                
                // Create FormData from the form - this will automatically include the image
                const formData = new FormData(this);
                
                // Log form data for debugging
                console.log('Form data entries:');
                for (let [key, value] of formData.entries()) {
                    if (key === 'image') {
                        console.log(`${key}:`, value instanceof File ? `File: ${value.name} (${value.size} bytes, ${value.type})` : value);
                    } else {
                        console.log(`${key}:`, value);
                    }
                }
                
                // Get form values for validation
                const surveyTitle = formData.get('title');
                const surveyDescription = formData.get('description');
                const surveyCategory = formData.get('category');
                const surveyQuestion = formData.get('question');
                const surveyAnswers = Array.from(formData.getAll('answers')).map(answer => answer.trim());

                if (surveyAnswers.length < 2) {
                    window.showNotification('שגיאה', 'נדרש להוסיף לפחות 2 תשובות לסקר.');
                    return;
                }

                window.showNotification('יצירת סקר', 'טוען יצירת סקר...');

                const authToken = localStorage.getItem('authToken');
                const headers = {};
                if (authToken) {
                    headers['Authorization'] = `Bearer ${authToken}`;
                }
                
                fetch('/api/surveys/create', {
                    method: 'POST',
                    credentials: 'include',
                    headers: headers,
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Track successful survey creation
                        gtag('event', 'survey_creation_success', {
                            'event_category': 'survey_creation',
                            'event_label': 'survey_created',
                            'survey_id': data.surveyId
                        });
                        
                        window.showSuccessModal(data.surveyId);
                        window.closeSurveyModal();
                        // Refresh user data to show new survey
                        if (window.currentUserId) {
                            loadUserData(window.currentUserId);
                        }
                    } else {
                        // Track failed survey creation
                        gtag('event', 'survey_creation_error', {
                            'event_category': 'survey_creation',
                            'event_label': 'survey_creation_failed',
                            'error_message': data.error || 'Unknown error'
                        });
                        
                        window.showNotification('שגיאה', data.error || 'לא ניתן ליצור את הסקר.');
                    }
                })
                .catch(error => {
                    console.error('Error creating survey:', error);
                    
                    // Track survey creation exception
                    gtag('event', 'survey_creation_exception', {
                        'event_category': 'survey_creation',
                        'event_label': 'survey_creation_exception',
                        'error_message': error.message || 'Network error'
                    });
                    
                    window.showNotification('שגיאה', 'שגיאה ביצירת הסקר.');
                });
            });
        }
        });

        // Create floating particles
        function createParticles() {
            const particlesContainer = document.getElementById('particles');
            const particleCount = 50;

            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                
                // Random position and animation delay
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 8 + 's';
                particle.style.animationDuration = (Math.random() * 3 + 5) + 's';
                
                // Random color variation
                const colors = ['rgba(99, 102, 241, 0.4)', 'rgba(139, 92, 246, 0.4)', 'rgba(236, 72, 153, 0.4)'];
                particle.style.background = colors[Math.floor(Math.random() * colors.length)];
                
                particlesContainer.appendChild(particle);
            }
        }

        // Update scroll progress indicator
        function updateScrollIndicator() {
            window.addEventListener('scroll', function() {
                const scrollTop = document.documentElement.scrollTop;
                const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                const progress = (scrollTop / scrollHeight) * 100;
                
                document.getElementById('scrollIndicator').style.width = progress + '%';
            });
        }

        // Global functions
        window.createParticles = createParticles;
        window.updateScrollIndicator = updateScrollIndicator;

        // Create ripple effect
        function createRipple(event, element) {
            const ripple = document.createElement('span');
            const rect = element.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transform: scale(0);
                animation: ripple 0.6s linear;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                pointer-events: none;
            `;
            
            element.style.position = 'relative';
            element.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        }

        // Global function to create ripple
        window.createRipple = createRipple;

        // Modern notification system
        function showNotification(title, message) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 100px;
                right: 30px;
                background: rgba(15, 15, 30, 0.95);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(99, 102, 241, 0.3);
                border-radius: 16px;
                padding: 20px 24px;
                color: white;
                font-size: 14px;
                font-weight: 600;
                z-index: 10000;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                transform: translateX(400px);
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                max-width: 300px;
            `;
            
            notification.innerHTML = `
                <div style="font-weight: 700; margin-bottom: 4px; color: #6366f1;">${title}</div>
                <div style="color: #cbd5e1; font-size: 13px;">${message}</div>
            `;
            
            document.body.appendChild(notification);
            
            // Animate in
            setTimeout(() => {
                notification.style.transform = 'translateX(0)';
            }, 100);
            
            // Animate out and remove
            setTimeout(() => {
                notification.style.transform = 'translateX(400px)';
                setTimeout(() => {
                    notification.remove();
                }, 400);
            }, 3000);
        }

        // Global function to show notification
        window.showNotification = showNotification;

        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);

        // User authentication and session management
        async function loadUserSession() {
            try {
                console.log('Loading user session...');
                
                // First, check if we have JWT token in localStorage (from registration or login)
                const authToken = localStorage.getItem('authToken');
                const userData = localStorage.getItem('user');
                
                if (authToken && userData) {
                    console.log('JWT token found in localStorage');
                    
                    try {
                        // Verify the token is still valid by making a request to the server
                        const response = await fetch('/api/auth/profile', {
                            headers: {
                                'Authorization': `Bearer ${authToken}`
                            }
                        });
                        
                        if (response.ok) {
                            const profileData = await response.json();
                            if (profileData.success) {
                                console.log('Token is valid, user authenticated:', profileData.user);
                                
                                // Update UI with user data
                                document.getElementById('userName').textContent = profileData.user.fullName || profileData.user.email;
                                document.getElementById('userAvatar').textContent = (profileData.user.fullName || profileData.user.email).charAt(0).toUpperCase();
                                
                                // Load user's data
                                await loadUserData(profileData.user.id);
                                return;
                            }
                        }
                    } catch (error) {
                        console.log('Token validation failed, clearing localStorage');
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('user');
                    }
                }
                
                // Check if we have URL parameters indicating successful login
                const urlParams = new URLSearchParams(window.location.search);
                const loginSuccess = urlParams.get('login');
                const provider = urlParams.get('provider');
                const email = urlParams.get('email');
                const userId = urlParams.get('userId');
                
                console.log('URL params:', { loginSuccess, provider, email, userId });
                
                // If we have successful login parameters, use them directly
                if (loginSuccess === 'success' && userId) {
                    console.log('Login success detected from URL, using provided user data');
                    
                    // Create user object from URL parameters
                    const user = {
                        id: parseInt(userId),
                        email: email || 'user@example.com',
                        fullName: email ? email.split('@')[0] : 'User'
                    };
                    
                    console.log('Created user object from URL:', user);
                    
                    // Update UI with user data
                    document.getElementById('userName').textContent = user.fullName || user.email;
                    document.getElementById('userAvatar').textContent = (user.fullName || user.email).charAt(0).toUpperCase();
                    
                    // Check if this is a new user
                    if (urlParams.get('welcome') === 'true') {
                        showNotification(
                            'ברוך הבא ל-SurveyPro!',
                            `שלום ${user.fullName || user.email}, חשבונך נוצר בהצלחה!`
                        );
                        
                        // Update page title if it's a welcome
                        document.querySelector('.page-title').textContent = 'ברוך הבא ל-SurveyPro!';
                        document.querySelector('.page-subtitle').textContent = 'זהו החשבון הראשון שלך, בואו נתחיל ליצור סקרים מדהימים!';
                    }
                    
                    // Load user's data
                    await loadUserData(user.id);
                    return;
                }
                
                // If no URL parameters, try to get session from server
                console.log('No login parameters, checking server session...');
                
                const response = await fetch('/api/auth/session', {
                    credentials: 'include'
                });
                const data = await response.json();
                
                console.log('Server session response:', data);
                
                if (data.success && data.isAuthenticated) {
                    // User is authenticated
                    const user = data.user;
                    console.log('User authenticated from server:', user);
                    
                    // Update UI with user data
                    document.getElementById('userName').textContent = user.fullName || user.email;
                    document.getElementById('userAvatar').textContent = (user.fullName || user.email).charAt(0).toUpperCase();
                    
                    // Load user's data
                    await loadUserData(user.id);
                    
                } else {
                    // User is not authenticated, redirect to login
                    console.log('No authentication available, redirecting to login');
                    window.location.href = '/login.html';
                }
            } catch (error) {
                console.error('Error loading user session:', error);
                
                // Check if we have URL parameters as fallback
                const urlParams = new URLSearchParams(window.location.search);
                const loginSuccess = urlParams.get('login');
                const userId = urlParams.get('userId');
                
                if (loginSuccess === 'success' && userId) {
                    console.log('Using fallback: login parameters from URL');
                    const user = {
                        id: parseInt(userId),
                        email: urlParams.get('email') || 'user@example.com',
                        fullName: urlParams.get('email') ? urlParams.get('email').split('@')[0] : 'User'
                    };
                    
                    document.getElementById('userName').textContent = user.fullName || user.email;
                    document.getElementById('userAvatar').textContent = (user.fullName || user.email).charAt(0).toUpperCase();
                    
                    await loadUserData(user.id);
                } else {
                    // No fallback available, redirect to login
                    console.log('No fallback available, redirecting to login');
                    window.location.href = '/login.html';
                }
            }
        }

        // Load user's surveys and statistics
        async function loadUserData(userId) {
            try {
                console.log('Loading user data for user ID:', userId);
                
                // Store user ID for later use
                window.currentUserId = userId;
                
                // Load user's surveys
                const authToken = localStorage.getItem('authToken');
                const headers = {};
                if (authToken) {
                    headers['Authorization'] = `Bearer ${authToken}`;
                }
                
                const surveysResponse = await fetch('/api/surveys/my', {
                    credentials: 'include',
                    headers: headers
                });
                const surveysData = await surveysResponse.json();
                
                console.log('Raw surveys data:', surveysData);
                
                if (surveysData.success) {
                    console.log('Surveys loaded successfully:', surveysData.surveys);
                    // Store surveys globally for analytics
                    window.userSurveys = surveysData.surveys;
                    displayUserSurveys(surveysData.surveys);
                    // Calculate stats from surveys data
                    calculateAndDisplayStats(surveysData.surveys);
                    // Initialize analytics with the loaded surveys
                    populateSurveySelector(surveysData.surveys);
                } else {
                    console.log('No surveys data available');
                    // If no surveys, show empty stats
                    calculateAndDisplayStats([]);
                    // Initialize analytics with empty surveys
                    populateSurveySelector([]);
                }
                
                // Show success notification
                showNotification('ברוך הבא!', 'הדשבורד נטען בהצלחה');
                
            } catch (error) {
                console.error('Error loading user data:', error);
                showNotification('שגיאה', 'שגיאה בטעינת הנתונים שלך');
                // Show default stats on error
                calculateAndDisplayStats([]);
            }
        }

        // Display user's surveys
        function displayUserSurveys(surveys) {
            const surveysContainer = document.querySelector('.surveys-list');
            if (!surveysContainer) return;
            
            console.log('Displaying surveys:', surveys);
            
            if (surveys.length === 0) {
                surveysContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-clipboard-list" style="font-size: 48px; color: #6366f1; margin-bottom: 16px;"></i>
                        <h3>אין לך סקרים עדיין</h3>
                        <p>בואו נתחיל ליצור סקר ראשון!</p>
                        <button class="btn primary create-survey-btn" onclick="window.createNewSurvey()">
                            <i class="fas fa-plus"></i>
                            <span>צור סקר חדש</span>
                            <div class="btn-glow"></div>
                        </button>
                    </div>
                `;
                return;
            }
            
            surveysContainer.innerHTML = surveys.map(survey => {
                // Calculate response count from answers if responses not available
                const responseCount = survey.responses !== undefined && survey.responses > 0 ? survey.responses : 
                    (survey.answers && Array.isArray(survey.answers) ? 
                        survey.answers.reduce((sum, answer) => sum + (answer.votes || 0), 0) : 0);
                
                // Debug logging for each survey
                console.log(`Survey ${survey.id}: title="${survey.title}", responses=${survey.responses}, calculated=${responseCount}`);
                
                // Format creation date
                const creationDate = survey.createdAt || survey.created_at;
                const formattedDate = creationDate ? new Date(creationDate).toLocaleDateString('he-IL') : 'תאריך לא ידוע';
                
                return `
                    <div class="survey-item ${survey.isShared ? 'shared-survey' : ''}" data-survey-id="${survey.id}">
                        <div class="survey-header">
                            <div>
                                <div class="survey-title">
                                    ${survey.title || 'סקר ללא כותרת'}
                                    ${survey.isShared ? `
                                        <span class="shared-badge">
                                            <i class="fas fa-users"></i>
                                            משותף
                                        </span>
                                    ` : ''}
                                </div>
                                <div class="survey-meta">
                                    ${survey.isShared ? 'שותף ב-' + new Date(survey.sharedAt).toLocaleDateString('he-IL') + ' • ' : ''}
                                    נוצר ב-${formattedDate} • ${responseCount} תשובות • 
                                    <span class="status-badge ${survey.status === 'active' ? 'active' : 'completed'}">
                                        <i class="fas fa-${survey.status === 'active' ? 'play' : 'check'}" style="font-size: 10px;"></i>
                                        ${survey.status === 'active' ? 'פעיל' : 'הושלם'}
                                    </span>
                                </div>
                                <div class="survey-details">
                                    <span class="category-badge">${survey.category || 'כללי'}</span>
                                    ${survey.requirePhone ? '<span class="phone-required-badge"><i class="fas fa-phone"></i> דורש טלפון</span>' : ''}
                                    <span class="question-preview">${survey.question || 'שאלה לא זמינה'}</span>
                                </div>
                            </div>
                            <div class="survey-actions">
                                <button class="btn-icon primary" title="צפה בתוצאות" onclick="window.viewSurveyResults(${survey.id})">
                                    <i class="fas fa-chart-bar"></i>
                                </button>
                                <button class="btn-icon secondary" title="פתח עמוד סקר" onclick="window.openSurveyPage(${survey.id})">
                                    <i class="fas fa-external-link-alt"></i>
                                </button>
                                ${!survey.isShared ? `
                                    <button class="btn-icon" title="ערוך" onclick="window.editSurvey(${survey.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn-icon" title="שתף" onclick="window.shareSurvey(${survey.id})">
                                        <i class="fas fa-share"></i>
                                    </button>
                                    <button class="btn-icon info" title="שתף נתונים" onclick="window.shareSurveyData(${survey.id})">
                                        <i class="fas fa-users"></i>
                                    </button>
                                    <button class="btn-icon danger" title="מחק" onclick="window.deleteSurvey(${survey.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                ` : survey.sharedPermissions === 'full' ? `
                                    <button class="btn-icon" title="ערוך" onclick="window.editSurvey(${survey.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn-icon" title="שתף" onclick="window.shareSurvey(${survey.id})">
                                        <i class="fas fa-share"></i>
                                    </button>
                                    <button class="btn-icon info" title="שתף נתונים" onclick="window.shareSurveyData(${survey.id})">
                                        <i class="fas fa-users"></i>
                                    </button>
                                    <button class="btn-icon danger" title="מחק" onclick="window.deleteSurvey(${survey.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                ` : ''}
                                ${survey.isShared && (survey.sharedPermissions === 'export' || survey.sharedPermissions === 'full') ? `
                                    <button class="btn-icon export" title="ייצא לאקסל" onclick="window.exportSurvey(${survey.id})">
                                        <i class="fas fa-file-excel"></i>
                                    </button>
                                ` : ''}
                                ${!survey.isShared ? `
                                    <button class="btn-icon export" title="ייצא לאקסל" onclick="window.exportSurvey(${survey.id})">
                                        <i class="fas fa-file-excel"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Calculate and display user's statistics
        function calculateAndDisplayStats(surveys) {
            try {
                console.log('Starting stats calculation for surveys:', surveys);
                
                // Show loading state first
                showStatsLoading();
                
                // Simulate loading delay for better UX
                setTimeout(() => {
                                    // Calculate statistics from surveys data
                const totalSurveys = surveys.length;
                const activeSurveys = surveys.filter(s => s.status === 'active').length;
                
                // Calculate total responses from all surveys
                const totalResponses = surveys.reduce((sum, survey) => {
                    // Handle different response count formats
                    if (survey.responses !== undefined && survey.responses > 0) {
                        return sum + survey.responses;
                    } else if (survey.answers && Array.isArray(survey.answers)) {
                        // Sum up votes from answers if responses not available
                        const surveyVotes = survey.answers.reduce((answerSum, answer) => answerSum + (answer.votes || 0), 0);
                        console.log(`Survey ${survey.id} (${survey.title}): responses=${survey.responses}, calculated votes=${surveyVotes}`);
                        return sum + surveyVotes;
                    }
                    return sum;
                }, 0);
                
                console.log('Total calculated responses:', totalResponses);
                
                const avgResponses = totalSurveys > 0 ? Math.round(totalResponses / totalSurveys) : 0;
                
                // Get this week's responses (last 7 days)
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                const thisWeekResponses = surveys.reduce((sum, survey) => {
                    // Check if survey was created this week or has recent activity
                    const surveyDate = new Date(survey.createdAt || survey.created_at);
                    if (surveyDate >= oneWeekAgo) {
                        if (survey.responses !== undefined && survey.responses > 0) {
                            return sum + survey.responses;
                        } else if (survey.answers && Array.isArray(survey.answers)) {
                            const surveyVotes = survey.answers.reduce((answerSum, answer) => answerSum + (answer.votes || 0), 0);
                            console.log(`This week survey ${survey.id}: calculated votes=${surveyVotes}`);
                            return sum + surveyVotes;
                        }
                    }
                    return sum;
                }, 0);
                
                console.log('This week responses:', thisWeekResponses);
                    
                                    // Update stats cards with animation
                updateStatCard(1, totalSurveys, 'סקרים פעילים', 'surveys');
                updateStatCard(2, totalResponses, 'סה״כ תשובות', 'responses');
                updateStatCard(3, totalResponses > 0 ? Math.round((totalResponses / totalSurveys) * 10) / 10 : 0, 'ממוצע תשובות לסקר', 'completion');
                updateStatCard(4, thisWeekResponses, 'תשובות השבוע', 'recent');
                    
                    // Add success animation and state
                    animateStatsSuccess();
                    showStatsSuccess();
                    
                }, 800);
                
            } catch (error) {
                console.error('Error calculating stats:', error);
                // Show default values
                updateStatCard(1, 0, 'סקרים פעילים', 'surveys');
                updateStatCard(2, 0, 'סה״כ תשובות', 'responses');
                updateStatCard(3, 0, 'שיעור השלמה', 'completion');
                updateStatCard(4, 0, 'תשובות השבוע', 'recent');
                
                // Show error state
                showStatsError();
            }
        }

        // Show loading state for stats
        function showStatsLoading() {
            const statCards = document.querySelectorAll('.stat-card');
            statCards.forEach(card => {
                card.classList.add('loading');
                card.classList.remove('success', 'error');
            });
        }

        // Show success state for stats
        function showStatsSuccess() {
            const statCards = document.querySelectorAll('.stat-card');
            statCards.forEach((card, index) => {
                setTimeout(() => {
                    card.classList.remove('loading');
                    card.classList.add('success');
                }, index * 200);
            });
        }

        // Show error state for stats
        function showStatsError() {
            const statCards = document.querySelectorAll('.stat-card');
            statCards.forEach(card => {
                card.classList.remove('loading', 'success');
                card.classList.add('error');
            });
        }
        
        // Update individual stat card with animation
        function updateStatCard(cardIndex, value, title, iconType) {
            const statCard = document.querySelector(`.stat-card:nth-child(${cardIndex})`);
            if (!statCard) return;
            
            console.log(`Updating stat card ${cardIndex}: ${title} = ${value}`);
            
            const statValue = statCard.querySelector('.stat-value');
            const statTitle = statCard.querySelector('.stat-title');
            const statChange = statCard.querySelector('.stat-change');
            
            if (statValue) {
                // Animate the number change
                animateNumberChange(statValue, value);
            }
            
            if (statTitle) {
                statTitle.textContent = title;
            }
            
            if (statChange) {
                // Update change indicator based on value
                if (value > 0) {
                    statChange.innerHTML = '<i class="fas fa-arrow-up"></i> +' + value;
                    statChange.style.color = '#10b981';
                } else {
                    statChange.innerHTML = '<i class="fas fa-minus"></i> 0';
                    statChange.style.color = '#64748b';
                }
            }
        }
        
        // Animate number change
        function animateNumberChange(element, targetValue) {
            const startValue = 0;
            const duration = 1000;
            const startTime = performance.now();
            
            function updateNumber(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function for smooth animation
                const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuart);
                
                element.textContent = currentValue;
                
                if (progress < 1) {
                    requestAnimationFrame(updateNumber);
                }
            }
            
            requestAnimationFrame(updateNumber);
        }
        
        // Animate stats success
        function animateStatsSuccess() {
            const statCards = document.querySelectorAll('.stat-card');
            statCards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.transform = 'scale(1.05)';
                    card.style.boxShadow = '0 25px 60px rgba(99, 102, 241, 0.4)';
                    
                    setTimeout(() => {
                        card.style.transform = '';
                        card.style.boxShadow = '';
                    }, 300);
                }, index * 100);
            });
        }

        // Survey action functions
        function createNewSurvey() {
            window.openSurveyModal();
        }

        function viewSurveyResults(surveyId) {
            // Get survey data and show statistics modal
            fetch(`/api/surveys/${surveyId}`, {
                credentials: 'include'
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const survey = data.survey;
                        showSurveyStatisticsModal(survey);
                    } else {
                        window.showNotification('שגיאה', 'לא ניתן לטעון נתוני הסקר');
                    }
                })
                .catch(error => {
                    console.error('Error fetching survey data:', error);
                    window.showNotification('שגיאה', 'שגיאה בטעינת נתוני הסקר');
                });
        }

        // Show survey statistics modal
        function showSurveyStatisticsModal(survey) {
            // Debug logging to check data structure
            console.log('Survey data for modal:', survey);
            console.log('Survey answers:', survey.answers);
            console.log('Survey responses:', survey.responses);
            
            // Calculate total votes for debugging
            const totalVotes = survey.answers ? survey.answers.reduce((sum, ans) => sum + (ans.votes || 0), 0) : 0;
            console.log('Calculated total votes:', totalVotes);
            
            // Create modal HTML
            const modalHTML = `
                <div id="surveyStatsModal" class="modal show">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>תוצאות הסקר: ${survey.title}</h2>
                            <button class="close-btn" onclick="closeSurveyStatsModal()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="survey-stats-content">
                            <div class="survey-info">
                                <div class="info-row">
                                    <span class="info-label">תיאור:</span>
                                    <span class="info-value">${survey.description || 'אין תיאור'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">קטגוריה:</span>
                                    <span class="info-value">${survey.category}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">סטטוס:</span>
                                    <span class="info-value">
                                        <span class="status-badge ${survey.status === 'active' ? 'active' : 'completed'}">
                                            ${survey.status === 'active' ? 'פעיל' : 'הושלם'}
                                        </span>
                                    </span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">תאריך יצירה:</span>
                                    <span class="info-value">${new Date(survey.createdAt).toLocaleDateString('he-IL')}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">דורש טלפון:</span>
                                    <span class="info-value">
                                        <span class="status-badge ${survey.requirePhone ? 'active' : 'completed'}">
                                            ${survey.requirePhone ? 'כן' : 'לא'}
                                        </span>
                                    </span>
                                </div>
                            </div>
                            
                            <div class="question-section">
                                <h3>שאלת הסקר:</h3>
                                <p class="question-text">${survey.question}</p>
                            </div>
                            
                                                         <div class="results-section">
                                 <h3>תוצאות התשובות:</h3>
                                 <div class="answers-results">
                                     ${survey.answers.map(answer => {
                                         // Calculate total votes from all answers
                                         const totalVotes = survey.answers.reduce((sum, ans) => sum + (ans.votes || 0), 0);
                                         const percentage = totalVotes > 0 ? Math.round((answer.votes / totalVotes) * 100) : 0;
                                         const barWidth = percentage;
                                         return `
                                             <div class="answer-result">
                                                 <div class="answer-header">
                                                     <span class="answer-text">${answer.text}</span>
                                                     <span class="answer-stats">
                                                         ${answer.votes} הצבעות (${percentage}%)
                                                     </span>
                                                 </div>
                                                 <div class="progress-bar">
                                                     <div class="progress-fill" style="width: ${barWidth}%"></div>
                                                 </div>
                                             </div>
                                         `;
                                     }).join('')}
                                 </div>
                             </div>
                             
                             <div class="total-responses">
                                 <h3>סה"כ תשובות: <span class="response-count">${survey.answers.reduce((sum, answer) => sum + (answer.votes || 0), 0)}</span></h3>
                             </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button class="btn secondary" onclick="closeSurveyStatsModal()">סגור</button>
                            <button class="btn primary" onclick="exportSurveyResults(${survey.id})">
                                <i class="fas fa-file-excel"></i>
                                ייצא לאקסל
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Add CSS for the modal
            addSurveyStatsModalCSS();
        }

        // Close survey statistics modal
        function closeSurveyStatsModal() {
            const modal = document.getElementById('surveyStatsModal');
            if (modal) {
                modal.remove();
            }
        }

        // Export survey results
        function exportSurveyResults(surveyId) {
            // Call the export API endpoint
            fetch(`/api/surveys/${surveyId}/export`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Create and download Excel file
                    const survey = data.data.surveyInfo;
                    const answers = data.data.answers;
                    const responses = data.data.responses;
                    
                    // Create CSV content (simple Excel format)
                    let csvContent = 'data:text/csv;charset=utf-8,';
                    
                    // Survey info
                    csvContent += `סקר: ${survey.title}\n`;
                    csvContent += `תיאור: ${survey.description}\n`;
                    csvContent += `קטגוריה: ${survey.category}\n`;
                    csvContent += `שאלה: ${survey.question}\n`;
                    csvContent += `דורש טלפון: ${survey.requirePhone ? 'כן' : 'לא'}\n`;
                    csvContent += `סה"כ תשובות: ${survey.totalResponses}\n`;
                    csvContent += `תאריך ייצוא: ${survey.exportDate}\n\n`;
                    
                    // Answers summary
                    csvContent += 'תשובות,מספר הצבעות,אחוז\n';
                    answers.forEach(answer => {
                        csvContent += `${answer.answerText},${answer.votes},${answer.percentage}%\n`;
                    });
                    
                    csvContent += '\n';
                    
                    // Individual responses
                    csvContent += 'לינק סקר,מזהה תשובה,משתמש,תשובה,תאריך שליחה\n';
                    responses.forEach(response => {
                        csvContent += `${response.surveyUrl || 'לא ידוע'},${response.responseId},${response.userId || 'אנונימי'},${response.answer},${response.submittedAt}\n`;
                    });
                    
                    // Create download link
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement('a');
                    link.setAttribute('href', encodedUri);
                    link.setAttribute('download', `survey_${surveyId}_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    window.showNotification('ייצוא סקר', 'הקובץ הורד בהצלחה!');
                } else {
                    window.showNotification('שגיאה', data.error || 'לא ניתן לייצא את הסקר');
                }
            })
            .catch(error => {
                console.error('Export error:', error);
                window.showNotification('שגיאה', 'שגיאה בייצוא הסקר');
            });
        }

        // Add CSS for survey statistics modal
        function addSurveyStatsModalCSS() {
            if (document.getElementById('surveyStatsModalCSS')) return;
            
            const style = document.createElement('style');
            style.id = 'surveyStatsModalCSS';
            style.textContent = `
                .survey-stats-content {
                    padding: 20px 0;
                }
                
                .survey-info {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 24px;
                    margin-bottom: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }
                
                .info-row:last-child {
                    border-bottom: none;
                }
                
                .info-label {
                    font-weight: 600;
                    color: #cbd5e1;
                    font-size: 14px;
                }
                
                .info-value {
                    color: #ffffff;
                    font-size: 14px;
                }
                
                .question-section {
                    margin-bottom: 24px;
                }
                
                .question-section h3 {
                    color: #ffffff;
                    font-size: 18px;
                    margin-bottom: 12px;
                }
                
                .question-text {
                    color: #cbd5e1;
                    font-size: 16px;
                    line-height: 1.6;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 16px;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .results-section {
                    margin-bottom: 24px;
                }
                
                .results-section h3 {
                    color: #ffffff;
                    font-size: 18px;
                    margin-bottom: 16px;
                }
                
                .answers-results {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                
                .answer-result {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .answer-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }
                
                .answer-text {
                    color: #ffffff;
                    font-weight: 600;
                    font-size: 14px;
                }
                
                .answer-stats {
                    color: #10b981;
                    font-size: 12px;
                    font-weight: 600;
                    background: rgba(16, 185, 129, 0.1);
                    padding: 4px 8px;
                    border-radius: 8px;
                }
                
                .progress-bar {
                    width: 100%;
                    height: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    overflow: hidden;
                }
                
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #6366f1, #8b5cf6);
                    border-radius: 4px;
                    transition: width 0.8s ease;
                }
                
                .total-responses {
                    text-align: center;
                    padding: 20px;
                    background: rgba(99, 102, 241, 0.1);
                    border-radius: 16px;
                    border: 1px solid rgba(99, 102, 241, 0.2);
                }
                
                .total-responses h3 {
                    color: #ffffff;
                    font-size: 18px;
                    margin: 0;
                }
                
                .response-count {
                    color: #6366f1;
                    font-weight: 800;
                    font-size: 24px;
                }
                
                        .modal-actions {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            padding-top: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .modal-actions .btn {
            flex: 1;
            text-align: center;
            padding: 16px 24px;
            border-radius: 16px;
            font-weight: 700;
            font-size: 15px;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            border: none;
            cursor: pointer;
        }

        .modal-actions .btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.6s ease;
        }

        .modal-actions .btn:hover::before {
            left: 100%;
        }

        .modal-actions .btn.primary {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-actions .btn.primary:hover {
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            transform: translateY(-3px);
            box-shadow: 0 15px 35px rgba(99, 102, 241, 0.6);
        }

        .modal-actions .btn.secondary {
            background: rgba(255, 255, 255, 0.1);
            color: #cbd5e1;
            border: 2px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
        }

        .modal-actions .btn.secondary:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #ffffff;
            border-color: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(255, 255, 255, 0.2);
        }
        
        /* Edit Modal Specific Styles */
        #surveyEditModal {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.8) !important;
            backdrop-filter: blur(10px) !important;
            z-index: 10000 !important;
            display: none !important;
            align-items: center !important;
            justify-content: center !important;
            opacity: 1 !important;
            visibility: visible !important;
        }
        
        #surveyEditModal.show {
            display: flex !important;
            opacity: 1 !important;
            visibility: visible !important;
        }
        
        #surveyEditModal.hidden {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
        }
        
        /* Override any conflicting modal styles */
        #surveyEditModal.modal {
            position: fixed !important;
        }
        
        #surveyEditModal.modal.show {
            display: flex !important;
        }
        
        /* Force override for edit modal display */
        #surveyEditModal.modal.show,
        #surveyEditModal.show {
            display: flex !important;
        }
        
        /* Additional visibility fixes */
        #surveyEditModal.show {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
        }
        
        #surveyEditModal.show * {
            visibility: visible !important;
            opacity: 1 !important;
        }
        
        /* Force modal to be on top */
        #surveyEditModal {
            z-index: 99999 !important;
        }
        
        #surveyEditModal.show {
            z-index: 99999 !important;
        }
        
        /* Force visibility for edit modal content */
        #surveyEditModal .modal-content {
            max-width: 800px !important;
            max-height: 90vh !important;
            overflow-y: auto !important;
            background: rgba(15, 15, 30, 0.95) !important;
            border-radius: 20px !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5) !important;
            padding: 0 !important;
            position: relative !important;
            z-index: 10001 !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin: 0 auto !important;
            transform: none !important;
            color: white !important;
            /* Force content to be visible */
            min-width: 300px !important;
            min-height: 200px !important;
            /* Additional visibility fixes */
            position: relative !important;
            z-index: 10002 !important;
        }
        
        /* Ensure all form elements are visible */
        #surveyEditModal form {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        
        #surveyEditModal .survey-form {
            padding: 32px !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        
        #surveyEditModal .form-group {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin-bottom: 20px !important;
        }
        
        #surveyEditModal input,
        #surveyEditModal textarea,
        #surveyEditModal select {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        
        #surveyEditModal .modal-content {
            max-width: 800px !important;
            max-height: 90vh !important;
            overflow-y: auto !important;
            background: rgba(15, 15, 30, 0.95) !important;
            border-radius: 20px !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5) !important;
            padding: 0 !important;
            position: relative !important;
            z-index: 10001 !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin: 0 auto !important;
            transform: none !important;
            color: white !important;
        }
        
        /* Force visibility of all modal content */
        #surveyEditModal * {
            visibility: visible !important;
            opacity: 1 !important;
        }
        
        /* Ensure form is visible */
        #surveyEditModal form {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        
        /* Ensure all form elements are visible */
        #surveyEditModal .survey-form {
            padding: 32px !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        
        #surveyEditModal .form-group {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin-bottom: 20px !important;
        }
        
        #surveyEditModal input,
        #surveyEditModal textarea,
        #surveyEditModal select {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        
        #surveyEditModal .modal-header {
            padding: 24px 32px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        #surveyEditModal .modal-header h2 {
            color: #ffffff;
            font-size: 24px;
            font-weight: 700;
            margin: 0;
        }
        
        #surveyEditModal .close-btn {
            background: none;
            border: none;
            color: #cbd5e1;
            font-size: 20px;
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        
        #surveyEditModal .close-btn:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.1);
        }
        
        #surveyEditModal .survey-form {
            padding: 32px;
        }
        
        #surveyEditModal .form-group {
            margin-bottom: 20px;
        }
        
        #surveyEditModal .form-group label {
            display: block;
            color: #ffffff;
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        #surveyEditModal .form-group input,
        #surveyEditModal .form-group textarea,
        #surveyEditModal .form-group select {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.05);
            color: #ffffff;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        
        #surveyEditModal .form-group input:focus,
        #surveyEditModal .form-group textarea:focus,
        #surveyEditModal .form-group select:focus {
            border-color: #6366f1;
            background: rgba(255, 255, 255, 0.08);
            outline: none;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        #surveyEditModal .form-actions {
            display: flex;
            gap: 16px;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        #surveyEditModal .btn {
            flex: 1;
            padding: 16px 24px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 14px;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        #surveyEditModal .btn.primary {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
        }
        
        #surveyEditModal .btn.primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
        }
        
        #surveyEditModal .btn.secondary {
            background: rgba(255, 255, 255, 0.1);
            color: #cbd5e1;
            border: 2px solid rgba(255, 255, 255, 0.2);
        }
        
        #surveyEditModal .btn.secondary:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #ffffff;
        }
        
        #surveyEditModal .checkbox-label {
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            color: #ffffff;
            font-weight: 500;
        }
        
        #surveyEditModal .checkbox-label input[type="checkbox"] {
            width: auto;
            margin: 0;
        }
        
        #surveyEditModal .form-help {
            color: #94a3b8;
            font-size: 12px;
            margin-top: 4px;
            display: block;
        }
        
        #surveyEditModal .form-group {
            margin-bottom: 20px;
        }
        
        #surveyEditModal .answer-input {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }
        
        #surveyEditModal .answer-input input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.05);
            color: #ffffff;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        
        #surveyEditModal .answer-input input:focus {
            border-color: #6366f1;
            background: rgba(255, 255, 255, 0.08);
            outline: none;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        #surveyEditModal .remove-answer {
            background: rgba(239, 68, 68, 0.2);
            border: 2px solid rgba(239, 68, 68, 0.3);
            color: #ef4444;
            border-radius: 8px;
            padding: 8px 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        #surveyEditModal .remove-answer:hover {
            background: rgba(239, 68, 68, 0.3);
            border-color: rgba(239, 68, 68, 0.5);
            transform: scale(1.05);
        }
        
        #surveyEditModal .add-answer-btn {
            background: rgba(99, 102, 241, 0.2);
            border: 2px solid rgba(99, 102, 241, 0.3);
            color: #6366f1;
            border-radius: 12px;
            padding: 12px 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 16px;
        }
        
        #surveyEditModal .add-answer-btn:hover {
            background: rgba(99, 102, 241, 0.3);
            border-color: rgba(99, 102, 241, 0.5);
            transform: translateY(-2px);
        }
        
        #surveyEditModal .image-upload {
            position: relative;
            border: 2px dashed rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            padding: 32px;
            text-align: center;
            transition: all 0.3s ease;
            cursor: pointer;
            background: rgba(255, 255, 255, 0.02);
        }
        
        #surveyEditModal .image-upload:hover {
            border-color: rgba(99, 102, 241, 0.5);
            background: rgba(99, 102, 241, 0.05);
        }
        
        #surveyEditModal .upload-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            color: #cbd5e1;
        }
        
        #surveyEditModal .upload-placeholder i {
            font-size: 32px;
            color: #6366f1;
        }
        
        #surveyEditModal .image-preview {
            max-width: 100%;
            max-height: 200px;
            border-radius: 12px;
            border: 2px solid rgba(255, 255, 255, 0.1);
        }
        
        #surveyEditModal .image-preview.hidden {
            display: none;
        }
        
        #surveyEditModal .upload-placeholder.hidden {
            display: none;
        }
        
        @media (max-width: 768px) {
            .info-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
            
            .answer-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
            
            .modal-actions {
                flex-direction: column;
                gap: 16px;
            }

            .modal-actions .btn {
                padding: 14px 20px;
                font-size: 14px;
            }
            
            #surveyEditModal .answer-input {
                flex-direction: column;
                align-items: stretch;
                gap: 8px;
            }
            
            #surveyEditModal .remove-answer {
                align-self: flex-end;
            }
        }
            `;
            
            document.head.appendChild(style);
        }

        function editSurvey(surveyId) {
            console.log('Edit survey called for ID:', surveyId);
            
            // Fetch survey data and show editing modal
            fetch(`/api/surveys/${surveyId}`, {
                credentials: 'include'
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const survey = data.survey;
                        showSurveyEditModal(survey);
                    } else {
                        window.showNotification('שגיאה', 'לא ניתן לטעון נתוני הסקר לעריכה');
                    }
                })
                .catch(error => {
                    console.error('Error fetching survey for editing:', error);
                    window.showNotification('שגיאה', 'שגיאה בטעינת נתוני הסקר לעריכה');
                });
        }

        function shareSurvey(surveyId) {
            const surveyUrl = `${window.location.origin}/survey/${surveyId}`;
            
            // Create a temporary input to copy the URL
            const tempInput = document.createElement('input');
            tempInput.value = surveyUrl;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            
            // Show success message
            window.showNotification('שיתוף סקר', `הקישור הועתק ללוח: ${surveyUrl}`);
        }

        function exportSurvey(surveyId) {
            // Call the export API endpoint
            fetch(`/api/surveys/${surveyId}/export`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Create and download Excel file
                    const survey = data.data.surveyInfo;
                    const answers = data.data.answers;
                    const responses = data.data.responses;
                    
                    // Create CSV content (simple Excel format)
                    let csvContent = 'data:text/csv;charset=utf-8,';
                    
                    // Survey info
                    csvContent += `סקר: ${survey.title}\n`;
                    csvContent += `תיאור: ${survey.description}\n`;
                    csvContent += `קטגוריה: ${survey.category}\n`;
                    csvContent += `שאלה: ${survey.question}\n`;
                    csvContent += `דורש טלפון: ${survey.requirePhone ? 'כן' : 'לא'}\n`;
                    csvContent += `סה"כ תשובות: ${survey.totalResponses}\n`;
                    csvContent += `תאריך ייצוא: ${survey.exportDate}\n\n`;
                    
                    // Answers summary
                    csvContent += 'תשובות,מספר הצבעות,אחוז\n';
                    answers.forEach(answer => {
                        csvContent += `${answer.answerText},${answer.votes},${answer.percentage}%\n`;
                    });
                    
                    csvContent += '\n';
                    
                    // Individual responses
                    csvContent += 'לינק סקר,מזהה תשובה,משתמש,תשובה,תאריך שליחה\n';
                    responses.forEach(response => {
                        csvContent += `${response.surveyUrl || 'לא ידוע'},${response.responseId},${response.userId || 'אנונימי'},${response.answer},${response.submittedAt}\n`;
                    });
                    
                    // Create download link
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement('a');
                    link.setAttribute('href', encodedUri);
                    link.setAttribute('download', `survey_${surveyId}_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    window.showNotification('ייצוא סקר', 'הקובץ הורד בהצלחה!');
                } else {
                    window.showNotification('שגיאה', data.error || 'לא ניתן לייצא את הסקר');
                }
            })
            .catch(error => {
                console.error('Export error:', error);
                window.showNotification('שגיאה', 'שגיאה בייצוא הסקר');
            });
        }

        function deleteSurvey(surveyId) {
            // Ask for confirmation
            if (!confirm('האם אתה בטוח שברצונך למחוק את הסקר הזה? פעולה זו אינה הפיכה.')) {
                return;
            }
            
            // Call the delete API endpoint
            fetch(`/api/surveys/${surveyId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.showNotification('מחיקת סקר', 'הסקר נמחק בהצלחה!');
                    // Refresh user data to show updated surveys
                    if (window.currentUserId) {
                        loadUserData(window.currentUserId);
                    }
                } else {
                    window.showNotification('שגיאה', data.error || 'לא ניתן למחוק את הסקר');
                }
            })
            .catch(error => {
                console.error('Delete error:', error);
                window.showNotification('שגיאה', 'שגיאה במחיקת הסקר');
            });
        }

        // Share survey data with another user
        function shareSurveyData(surveyId) {
            // Show modal for entering email
            const modalHTML = `
                <div id="shareDataModal" class="modal show">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>שתף נתוני סקר</h2>
                            <button class="close-btn" onclick="closeShareDataModal()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p>הכנס את כתובת המייל של המשתמש איתו אתה רוצה לשתף את נתוני הסקר:</p>
                            <div class="form-group">
                                <label for="shareEmail">כתובת מייל *</label>
                                <input type="email" id="shareEmail" placeholder="example@email.com" required>
                            </div>
                            <div class="form-group">
                                <label for="sharePermissions">הרשאות</label>
                                <select id="sharePermissions">
                                    <option value="view">צפייה בלבד</option>
                                    <option value="export">צפייה וייצוא</option>
                                    <option value="full">גישה מלאה</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-actions">
                            <button class="btn secondary" onclick="closeShareDataModal()">ביטול</button>
                            <button class="btn primary" onclick="confirmShareData(${surveyId})">
                                <i class="fas fa-share"></i>
                                שתף נתונים
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        // Close share data modal
        function closeShareDataModal() {
            const modal = document.getElementById('shareDataModal');
            if (modal) {
                modal.remove();
            }
        }

        // Confirm and execute data sharing
        function confirmShareData(surveyId) {
            const email = document.getElementById('shareEmail').value.trim();
            const permissions = document.getElementById('sharePermissions').value;
            
            if (!email) {
                window.showNotification('שגיאה', 'יש להכניס כתובת מייל');
                return;
            }
            
            // Call API to share data
            fetch(`/api/surveys/${surveyId}/share-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: email,
                    permissions: permissions
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.showNotification('שיתוף נתונים', 'הנתונים שותפו בהצלחה!');
                    closeShareDataModal();
                } else {
                    window.showNotification('שגיאה', data.error || 'לא ניתן לשתף את הנתונים');
                }
            })
            .catch(error => {
                console.error('Share data error:', error);
                window.showNotification('שגיאה', 'שגיאה בשיתוף הנתונים');
            });
        }

        // Load shared surveys
        function loadSharedSurveys() {
            fetch('/api/surveys/shared', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displaySharedSurveys(data.surveys);
                    // Change title to show shared surveys
                    document.querySelector('.section-title').textContent = 'סקרים משותפים איתי';
                    // Hide create button for shared surveys
                    document.getElementById('createSurveyBtn').style.display = 'none';
                    // Add back button
                    if (!document.getElementById('backToMySurveysBtn')) {
                        const backBtn = document.createElement('button');
                        backBtn.id = 'backToMySurveysBtn';
                        backBtn.className = 'btn secondary';
                        backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> חזור לסקרים שלי';
                        backBtn.onclick = loadMySurveys;
                        document.querySelector('.header-actions').insertBefore(backBtn, document.querySelector('.header-actions').firstChild);
                    }
                } else {
                    window.showNotification('שגיאה', data.error || 'לא ניתן לטעון סקרים משותפים');
                }
            })
            .catch(error => {
                console.error('Shared surveys error:', error);
                window.showNotification('שגיאה', 'שגיאה בטעינת סקרים משותפים');
            });
        }

        // Load my surveys (original surveys)
        function loadMySurveys() {
            if (window.currentUserId) {
                loadUserData(window.currentUserId);
                // Restore original title
                document.querySelector('.section-title').textContent = 'הסקרים שלך';
                // Show create button
                document.getElementById('createSurveyBtn').style.display = 'inline-flex';
                // Remove back button
                const backBtn = document.getElementById('backToMySurveysBtn');
                if (backBtn) {
                    backBtn.remove();
                }
            }
        }

        // Display shared surveys
        function displaySharedSurveys(sharedSurveys) {
            const surveysList = document.querySelector('.surveys-list');
            
            if (sharedSurveys.length === 0) {
                surveysList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users" style="font-size: 48px; color: #6366f1; margin-bottom: 16px;"></i>
                        <h3>אין סקרים משותפים איתך</h3>
                        <p>אף אחד לא שיתף איתך סקרים עדיין</p>
                    </div>
                `;
                return;
            }

            surveysList.innerHTML = sharedSurveys.map(survey => `
                <div class="survey-card shared-survey" data-survey-id="${survey.id}">
                    <div class="survey-header">
                        <div class="survey-title">
                            <h4>${survey.title}</h4>
                            <span class="shared-badge">
                                <i class="fas fa-users"></i>
                                משותף
                            </span>
                        </div>
                        <div class="survey-meta">
                            <span class="created-date">נוצר: ${new Date(survey.createdAt).toLocaleDateString('he-IL')}</span>
                            <span class="shared-date">שותף: ${new Date(survey.sharedAt).toLocaleDateString('he-IL')}</span>
                            <span class="permissions-badge">${getPermissionText(survey.sharedPermissions)}</span>
                        </div>
                    </div>
                    <div class="survey-content">
                        <div class="survey-info">
                            <span class="category-badge">${survey.category || 'כללי'}</span>
                            <span class="question-preview">${survey.question || 'שאלה לא זמינה'}</span>
                        </div>
                        <div class="survey-actions">
                            <button class="btn-icon primary" title="צפה בתוצאות" onclick="window.viewSurveyResults(${survey.id})">
                                <i class="fas fa-chart-bar"></i>
                            </button>
                            <button class="btn-icon secondary" title="פתח עמוד סקר" onclick="window.openSurveyPage(${survey.id})">
                                <i class="fas fa-external-link-alt"></i>
                            </button>
                            ${survey.sharedPermissions === 'export' || survey.sharedPermissions === 'full' ? `
                                <button class="btn-icon export" title="ייצא לאקסל" onclick="window.exportSurvey(${survey.id})">
                                    <i class="fas fa-file-excel"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Get permission text in Hebrew
        function getPermissionText(permissions) {
            switch (permissions) {
                case 'view': return 'צפייה בלבד';
                case 'export': return 'צפייה וייצוא';
                case 'full': return 'גישה מלאה';
                default: return 'לא ידוע';
            }
        }

        // Show survey edit modal
        function showSurveyEditModal(survey) {
            console.log('Opening survey edit modal for survey:', survey);
            
            // Check if modal element exists
            const editModal = document.getElementById('surveyEditModal');
            if (!editModal) {
                console.error('Edit modal element not found!');
                window.showNotification('שגיאה', 'לא ניתן לפתוח את חלון עריכת הסקר');
                return;
            }
            
            console.log('Edit modal element found:', editModal);
            
            // Populate form fields with survey data
            const editSurveyId = document.getElementById('editSurveyId');
            const editSurveyTitle = document.getElementById('editSurveyTitle');
            const editSurveyDescription = document.getElementById('editSurveyDescription');
            const editSurveyCategory = document.getElementById('editSurveyCategory');
            const editSurveyQuestion = document.getElementById('editSurveyQuestion');
            const editThankYouMessage = document.getElementById('editThankYouMessage');
            const editRequirePhone = document.getElementById('editRequirePhone');
            
            if (editSurveyId) editSurveyId.value = survey.id;
            if (editSurveyTitle) editSurveyTitle.value = survey.title || '';
            if (editSurveyDescription) editSurveyDescription.value = survey.description || '';
            if (editSurveyCategory) editSurveyCategory.value = survey.category || '';
            if (editSurveyQuestion) editSurveyQuestion.value = survey.question || '';
            if (editThankYouMessage) editThankYouMessage.value = survey.thankYouMessage || '';
            if (editRequirePhone) editRequirePhone.checked = survey.requirePhone || false;
            
            // Populate answers
            const editAnswersContainer = document.getElementById('editAnswersContainer');
            if (editAnswersContainer) {
                if (survey.answers && Array.isArray(survey.answers)) {
                    editAnswersContainer.innerHTML = '';
                    survey.answers.forEach((answer, index) => {
                        const answerDiv = document.createElement('div');
                        answerDiv.className = 'answer-input';
                        answerDiv.innerHTML = `
                            <input type="text" name="answers" required placeholder="תשובה ${index + 1}" value="${answer.text || answer.answer || ''}">
                            <button type="button" class="remove-answer" style="display: ${survey.answers.length > 2 ? 'block' : 'none'}">
                                <i class="fas fa-trash"></i>
                            </button>
                        `;
                        editAnswersContainer.appendChild(answerDiv);
                    });
                } else {
                    // Default answers if none exist
                    editAnswersContainer.innerHTML = `
                        <div class="answer-input">
                            <input type="text" name="answers" required placeholder="תשובה 1">
                            <button type="button" class="remove-answer" style="display: none;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div class="answer-input">
                            <input type="text" name="answers" required placeholder="תשובה 2">
                            <button type="button" class="remove-answer" style="display: none;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                }
            }
            
            // Show image preview if exists
            const editImagePreview = document.getElementById('editImagePreview');
            const editUploadPlaceholder = document.getElementById('editUploadPlaceholder');
            if (editImagePreview && editUploadPlaceholder) {
                if (survey.image) {
                    editImagePreview.src = survey.image;
                    editImagePreview.classList.remove('hidden');
                    editUploadPlaceholder.classList.add('hidden');
                } else {
                    editImagePreview.classList.add('hidden');
                    editUploadPlaceholder.classList.remove('hidden');
                }
            }
            
            // Show modal
            editModal.classList.remove('hidden');
            editModal.classList.add('show');
            editModal.style.display = 'flex';
            
            // Setup edit modal event listeners only once
            if (!window.editModalEventListenersSetup) {
                setupEditModalEventListeners();
                window.editModalEventListenersSetup = true;
            }
            
            console.log('Modal shown successfully');
        }
        
        // Close survey edit modal
        function closeSurveyEditModal() {
            const editModal = document.getElementById('surveyEditModal');
            if (editModal) {
                editModal.classList.add('hidden');
                editModal.classList.remove('show');
                editModal.style.display = 'none';
                console.log('Edit modal closed');
            }
        }
        
        // Setup edit modal event listeners
        function setupEditModalEventListeners() {
            console.log('Setting up edit modal event listeners...');
            
            // Close button
            const closeEditBtn = document.getElementById('closeSurveyEditModalBtn');
            if (closeEditBtn) {
                closeEditBtn.onclick = closeSurveyEditModal;
                console.log('Close button event listener added');
            } else {
                console.error('Close button not found');
            }
            
            // Cancel button
            const cancelEditBtn = document.getElementById('cancelSurveyEditBtn');
            if (cancelEditBtn) {
                cancelEditBtn.onclick = closeSurveyEditModal;
            }
            
            // Add answer button
            const editAddAnswerBtn = document.getElementById('editAddAnswerBtn');
            if (editAddAnswerBtn) {
                editAddAnswerBtn.onclick = function() {
                    const editAnswersContainer = document.getElementById('editAnswersContainer');
                    const newAnswerDiv = document.createElement('div');
                    newAnswerDiv.className = 'answer-input';
                    newAnswerDiv.innerHTML = `
                        <input type="text" name="answers" required placeholder="תשובה ${editAnswersContainer.children.length + 1}">
                        <button type="button" class="remove-answer">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                    
                    editAnswersContainer.appendChild(newAnswerDiv);
                    
                    // Show remove buttons for all answers
                    const removeButtons = editAnswersContainer.querySelectorAll('.remove-answer');
                    removeButtons.forEach(btn => btn.style.display = 'block');
                    
                    // Add remove functionality
                    const newRemoveButton = newAnswerDiv.querySelector('.remove-answer');
                    newRemoveButton.onclick = function() {
                        newAnswerDiv.remove();
                        // Hide remove buttons if only 2 answers remain
                        if (editAnswersContainer.children.length <= 2) {
                            editAnswersContainer.querySelectorAll('.remove-answer').forEach(btn => btn.style.display = 'none');
                        }
                    };
                };
            }
            
            // Remove answer buttons
            const editRemoveButtons = document.querySelectorAll('#editAnswersContainer .remove-answer');
            editRemoveButtons.forEach(btn => {
                btn.onclick = function() {
                    const answerInput = btn.closest('.answer-input');
                    if (answerInput) {
                        answerInput.remove();
                        // Hide remove buttons if only 2 answers remain
                        const editAnswersContainer = document.getElementById('editAnswersContainer');
                        if (editAnswersContainer.children.length <= 2) {
                            editAnswersContainer.querySelectorAll('.remove-answer').forEach(btn => btn.style.display = 'none');
                        }
                    }
                };
            });
            
            // Image preview
            const editSurveyImageInput = document.getElementById('editSurveyImage');
            if (editSurveyImageInput) {
                editSurveyImageInput.onchange = function() {
                    const editImagePreview = document.getElementById('editImagePreview');
                    const editUploadPlaceholder = document.getElementById('editUploadPlaceholder');
                    
                    if (this.files && this.files[0]) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            editImagePreview.src = e.target.result;
                            editImagePreview.classList.remove('hidden');
                            editUploadPlaceholder.classList.add('hidden');
                        }
                        reader.readAsDataURL(this.files[0]);
                    }
                };
            }
            
            // Form submission
            const editForm = document.getElementById('surveyEditForm');
            if (editForm) {
                editForm.onsubmit = function(e) {
                    e.preventDefault();
                    submitSurveyEdit();
                };
            }
        }
        
        // Submit survey edit
        function submitSurveyEdit() {
            const formData = new FormData(document.getElementById('surveyEditForm'));
            const surveyId = formData.get('surveyId');
            
            // Validate form
            const title = formData.get('title');
            const category = formData.get('category');
            const question = formData.get('question');
            const answers = Array.from(formData.getAll('answers')).map(answer => answer.trim());
            
            if (!title || !category || !question) {
                window.showNotification('שגיאה', 'יש למלא את כל השדות הנדרשים');
                return;
            }
            
            if (answers.length < 2) {
                window.showNotification('שגיאה', 'נדרש להוסיף לפחות 2 תשובות לסקר');
                return;
            }
            
            // Show loading
            window.showNotification('עריכת סקר', 'שומר שינויים...');
            
            // Submit to API
            fetch(`/api/surveys/${surveyId}/edit`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.showNotification('עריכת סקר', 'הסקר נערך בהצלחה!');
                    closeSurveyEditModal();
                    
                    // Refresh user data to show updated survey
                    if (window.currentUserId) {
                        loadUserData(window.currentUserId);
                    }
                } else {
                    window.showNotification('שגיאה', data.error || 'לא ניתן לערוך את הסקר');
                }
            })
            .catch(error => {
                console.error('Error editing survey:', error);
                window.showNotification('שגיאה', 'שגיאה בעריכת הסקר');
            });
        }

        // Global functions
        window.createNewSurvey = createNewSurvey;
        window.viewSurveyResults = viewSurveyResults;
        window.showSurveyStatisticsModal = showSurveyStatisticsModal;
        window.closeSurveyStatsModal = closeSurveyStatsModal;
        window.exportSurveyResults = exportSurveyResults;
        window.editSurvey = editSurvey;
        window.showSurveyEditModal = showSurveyEditModal;
        window.closeSurveyEditModal = closeSurveyEditModal;
        window.submitSurveyEdit = submitSurveyEdit;
        window.setupEditModalEventListeners = setupEditModalEventListeners;
        window.shareSurvey = shareSurvey;
        window.shareSurveyData = shareSurveyData;
        window.closeShareDataModal = closeShareDataModal;
        window.confirmShareData = confirmShareData;
        window.loadSharedSurveys = loadSharedSurveys;
        window.loadMySurveys = loadMySurveys;
        window.exportSurvey = exportSurvey;
        window.deleteSurvey = deleteSurvey;

            // Navigation functions
            function showDashboard() {
                // Show main dashboard content
                document.querySelector('.main-content').style.display = 'block';
                window.showNotification('דשבורד', 'מציג את הדשבורד הראשי');
            }

            function showAnalytics() {
                window.showNotification('אנליטיקה', 'מציג נתונים מתקדמים וניתוחים');
            }

            function showAllSurveys() {
                window.showNotification('כל הסקרים', 'מציג את כל הסקרים שלך');
            }

            function showArchivedSurveys() {
                window.showNotification('סקרים מאורכבים', 'מציג סקרים שהושלמו');
            }

            function showExportOptions() {
                window.showNotification('ייצוא לאקסל', 'אפשרויות ייצוא מתקדמות');
            }

            function showSharingOptions() {
                window.showNotification('שיתוף', 'אפשרויות שיתוף וקישורים');
            }

            function showSettings() {
                window.showNotification('הגדרות', 'הגדרות מערכת וחשבון');
            }

        // Modal functions
        function openSurveyModal() {
            // Use the global function
            window.openSurveyModal();
        }

        function closeSurveyModal() {
            const surveyModal = document.getElementById('surveyModal');
            if (surveyModal) {
                surveyModal.classList.add('hidden');
                surveyModal.classList.remove('show');
                // Mark modal as closed
                window.surveyModalOpen = false;
                console.log('Modal closed, state reset');
            }
        }

        function showSuccessModal(surveyId) {
            const successModal = document.getElementById('successModal');
            const surveyModal = document.getElementById('surveyModal');
            
            if (successModal && surveyModal) {
                successModal.classList.remove('hidden');
                successModal.classList.add('show');
                surveyModal.classList.add('hidden');
                surveyModal.classList.remove('show');
                // Store survey ID for later use
                window.lastCreatedSurveyId = surveyId;
                // Mark modal as closed
                window.surveyModalOpen = false;
                console.log('Success modal shown, survey modal state reset');
            }
        }

        function closeSuccessModal() {
            const successModal = document.getElementById('successModal');
            if (successModal) {
                successModal.classList.add('hidden');
                successModal.classList.remove('show');
                // Reset modal state
                window.surveyModalOpen = false;
                console.log('Success modal closed, survey modal state reset');
            }
        }

        function openSurveyPage(surveyId) {
            // Open survey page in new tab
            window.open(`/survey/${surveyId}`, '_blank');
        }

        // Global functions
        window.closeSurveyModal = closeSurveyModal;
        window.showSuccessModal = showSuccessModal;
        window.closeSuccessModal = closeSuccessModal;
        window.openSurveyPage = openSurveyPage;

        // Image preview function
        function previewImage(input) {
            const preview = document.getElementById('imagePreview');
            const uploadPlaceholder = document.getElementById('uploadPlaceholder');

            if (!preview || !uploadPlaceholder) {
                console.error('Image preview elements not found');
                return;
            }

            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    preview.classList.add('show');
                    uploadPlaceholder.classList.add('hidden');
                }
                reader.readAsDataURL(input.files[0]);
            } else {
                preview.src = '';
                preview.classList.remove('show');
                uploadPlaceholder.classList.remove('hidden');
            }
        }

        // Global function to preview image
        window.previewImage = previewImage;

        // Add/Remove answer functionality
        function addAnswer() {
            const answersContainer = document.getElementById('answersContainer');
            if (!answersContainer) {
                console.error('Answers container not found');
                return;
            }
            
            const newAnswerDiv = document.createElement('div');
            newAnswerDiv.className = 'answer-input';
            newAnswerDiv.innerHTML = `
                <input type="text" name="answers" required placeholder="תשובה ${answersContainer.children.length + 1}">
                <button type="button" class="remove-answer" style="display: none;">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            answersContainer.appendChild(newAnswerDiv);
            
            // Add event listener to the new remove button
            const newRemoveButton = newAnswerDiv.querySelector('.remove-answer');
            newRemoveButton.addEventListener('click', function() {
                window.removeAnswer(this);
            });
            
            // Show remove buttons for all answers
            const removeButtons = answersContainer.querySelectorAll('.remove-answer');
            removeButtons.forEach(btn => btn.style.display = 'block');
            
            // Mark that we need to setup remove buttons again
            window.removeAnswerButtonsSetup = false;
        }

        // Global function to add answer
        window.addAnswer = addAnswer;

        function removeAnswer(button) {
            const answerInput = button.closest('.answer-input');
            if (answerInput) {
                answerInput.remove();
                
                // Hide remove buttons if only 2 answers remain
                const answersContainer = document.getElementById('answersContainer');
                if (answersContainer) {
                    const removeButtons = answersContainer.querySelectorAll('.remove-answer');
                    if (removeButtons.length <= 2) {
                        removeButtons.forEach(btn => btn.style.display = 'none');
                    }
                }
                
                // Mark that we need to setup remove buttons again
                window.removeAnswerButtonsSetup = false;
            }
        }

        // Global function to remove answer
        window.removeAnswer = removeAnswer;

        // Initialize user session when page loads
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Dashboard loaded, checking user session...');
            
            // Debug: Check if edit modal exists
            const editModal = document.getElementById('surveyEditModal');
            console.log('Edit modal element found on load:', editModal);
            if (editModal) {
                console.log('Edit modal HTML:', editModal.outerHTML);
            }
            
            // Check if we're already on dashboard with login success
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('login') === 'success') {
                console.log('Login success detected, proceeding to load session...');
                loadUserSession();
            } else {
                console.log('No login success detected, checking session...');
                loadUserSession();
            }
        });

        // Global function to open survey modal
        window.openSurveyModal = function() {
            console.log('=== OPENING SURVEY MODAL (GLOBAL) ===');
            
            // Track survey creation modal open
            gtag('event', 'survey_creation_modal_open', {
                'event_category': 'survey_creation',
                'event_label': 'modal_opened'
            });
            
            // Check if modal is already open
            if (window.surveyModalOpen) {
                console.log('Modal already open, skipping...');
                return;
            }
            
            const surveyModal = document.getElementById('surveyModal');
            const surveyForm = document.getElementById('surveyForm');
            const imagePreview = document.getElementById('imagePreview');
            const uploadPlaceholder = document.getElementById('uploadPlaceholder');
            const answersContainer = document.getElementById('answersContainer');
            const addAnswerBtn = document.getElementById('addAnswerBtn');
            
            console.log('Modal elements found:', {
                surveyModal: !!surveyModal,
                surveyForm: !!surveyForm,
                imagePreview: !!imagePreview,
                uploadPlaceholder: !!uploadPlaceholder,
                answersContainer: !!answersContainer,
                addAnswerBtn: !!addAnswerBtn
            });
            
            // Check if all required elements exist
            if (!surveyModal || !surveyForm || !imagePreview || !uploadPlaceholder || !answersContainer || !addAnswerBtn) {
                console.error('Required modal elements not found');
                window.showNotification('שגיאה', 'לא ניתן לפתוח את חלון יצירת הסקר');
                return;
            }
            
            // Mark modal as open
            window.surveyModalOpen = true;
            
            // Show modal
            surveyModal.classList.remove('hidden');
            surveyModal.classList.add('show');
            console.log('Modal shown successfully');
            
            // Reset form
            surveyForm.reset();
            
            // Reset image preview
            imagePreview.classList.add('hidden');
            uploadPlaceholder.classList.remove('hidden');
            
            // Reset answers container
            answersContainer.innerHTML = `
                <div class="answer-input">
                    <input type="text" name="answers" required placeholder="תשובה 1">
                    <button type="button" class="remove-answer" style="display: none;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="answer-input">
                    <input type="text" name="answers" required placeholder="תשובה 2">
                    <button type="button" class="remove-answer" style="display: none;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            // Show the add answer button
            addAnswerBtn.style.display = 'block';
            
            // Setup modal event listeners (only once)
            if (!window.modalEventListenersSetup) {
                window.setupModalEventListeners();
                window.modalEventListenersSetup = true;
            }
            
            console.log('=== MODAL SETUP COMPLETED (GLOBAL) ===');
        };

        // Setup modal event listeners
        function setupModalEventListeners() {
            console.log('Setting up modal event listeners...');
            
            // Check if already setup
            if (window.modalEventListenersSetup) {
                console.log('Modal event listeners already setup, skipping...');
                return;
            }
            
            // Close survey modal button
            const closeSurveyModalBtn = document.getElementById('closeSurveyModalBtn');
            if (closeSurveyModalBtn && !closeSurveyModalBtn.hasAttribute('data-listener-added')) {
                closeSurveyModalBtn.addEventListener('click', window.closeSurveyModal);
                closeSurveyModalBtn.setAttribute('data-listener-added', 'true');
                console.log('Close button event listener added');
            }

            // Cancel survey button
            const cancelSurveyBtn = document.getElementById('cancelSurveyBtn');
            if (cancelSurveyBtn && !cancelSurveyBtn.hasAttribute('data-listener-added')) {
                cancelSurveyBtn.addEventListener('click', window.closeSurveyModal);
                cancelSurveyBtn.setAttribute('data-listener-added', 'true');
                console.log('Cancel button event listener added');
            }

            // Add answer button
            const addAnswerBtn = document.getElementById('addAnswerBtn');
            if (addAnswerBtn && !addAnswerBtn.hasAttribute('data-listener-added')) {
                addAnswerBtn.addEventListener('click', window.addAnswer);
                addAnswerBtn.setAttribute('data-listener-added', 'true');
                console.log('Add answer button event listener added');
            }

            // Close success modal button
            const closeSuccessBtn = document.getElementById('closeSuccessBtn');
            if (closeSuccessBtn && !closeSuccessBtn.hasAttribute('data-listener-added')) {
                closeSuccessBtn.addEventListener('click', window.closeSuccessModal);
                closeSuccessBtn.setAttribute('data-listener-added', 'true');
                console.log('Close success button event listener added');
            }

            // Open survey button
            const openSurveyBtn = document.getElementById('openSurveyBtn');
            if (openSurveyBtn && !openSurveyBtn.hasAttribute('data-listener-added')) {
                openSurveyBtn.addEventListener('click', function() {
                    if (window.lastCreatedSurveyId) {
                        window.openSurveyPage(window.lastCreatedSurveyId);
                    } else {
                        console.error('No survey ID found');
                    }
                });
                openSurveyBtn.setAttribute('data-listener-added', 'true');
                console.log('Open survey button event listener added');
            }

            // Survey image input
            const surveyImageInput = document.getElementById('surveyImage');
            if (surveyImageInput && !surveyImageInput.hasAttribute('data-listener-added')) {
                surveyImageInput.addEventListener('change', function() {
                    window.previewImage(this);
                });
                surveyImageInput.setAttribute('data-listener-added', 'true');
                console.log('Image input event listener added');
            }

            // Setup remove answer buttons (only once)
            if (!window.removeAnswerButtonsSetup) {
                window.setupRemoveAnswerButtons();
                window.removeAnswerButtonsSetup = true;
            }
            
            console.log('Modal event listeners setup completed');
        }

        // Global function to setup modal event listeners
        window.setupModalEventListeners = setupModalEventListeners;

        // Setup remove answer buttons
        function setupRemoveAnswerButtons() {
            console.log('Setting up remove answer buttons...');
            
            // Check if already setup
            if (window.removeAnswerButtonsSetup) {
                console.log('Remove answer buttons already setup, skipping...');
                return;
            }
            
            const removeButtons = document.querySelectorAll('.remove-answer');
            console.log('Found remove buttons:', removeButtons.length);
            
            removeButtons.forEach((button, index) => {
                if (!button.hasAttribute('data-listener-added')) {
                    button.addEventListener('click', function() {
                        window.removeAnswer(this);
                    });
                    button.setAttribute('data-listener-added', 'true');
                    console.log(`Remove button ${index + 1} event listener added`);
                }
            });
            
            console.log('Remove answer buttons setup completed');
        }

        // Global function to setup remove answer buttons
        window.setupRemoveAnswerButtons = setupRemoveAnswerButtons;

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async function() {
                try {
                    console.log('Logging out...');
                    
                    // Call logout endpoint
                    const response = await fetch('/logout');
                    
                    // Clear any local storage or session data
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    // Clear URL parameters
                    const currentUrl = new URL(window.location);
                    currentUrl.search = '';
                    window.history.replaceState({}, document.title, currentUrl.pathname);
                    
                    // Redirect to home page
                    window.location.href = '/';
                    
                } catch (error) {
                    console.error('Error during logout:', error);
                    // Force redirect anyway
                    window.location.href = '/';
                }
            });
        }

        // Survey action buttons (delegated event handling)
        document.addEventListener('click', function(e) {
            if (e.target.closest('.survey-actions')) {
                const action = e.target.closest('button');
                if (action) {
                    const surveyItem = action.closest('.survey-item');
                    const surveyId = surveyItem.dataset.surveyId;
                    const actionType = action.title || action.getAttribute('title');
                    
                    if (actionType.includes('צפה בתוצאות')) {
                        window.viewSurveyResults(surveyId);
                    } else if (actionType.includes('ערוך')) {
                        window.editSurvey(surveyId);
                    } else if (actionType.includes('שתף')) {
                        window.shareSurvey(surveyId);
                    } else if (actionType.includes('ייצא לאקסל')) {
                        window.exportSurvey(surveyId);
                    }
                }
            }
        });

        // Export survey buttons (existing ones)
        const exportSurveyButtons = document.querySelectorAll('.export-survey');
        exportSurveyButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const surveyId = this.getAttribute('data-survey');
                const surveyTitle = this.closest('.survey-item').querySelector('.survey-title').textContent;
                window.showNotification(`ייצוא "${surveyTitle}"`, 'הדוח מוכן להורדה!');
            });
        });

        // Analytics Functions
        let currentSurveyData = null;
        let pieChart = null;
        let lineChart = null;

        // Populate survey selector with user's surveys
        function populateSurveySelector(surveys) {
            const surveySelect = document.getElementById('surveySelect');
            if (!surveySelect) return;

            // Clear existing options
            surveySelect.innerHTML = '<option value="">בחר סקר מהרשימה</option>';
            
            // Add survey options
            surveys.forEach(survey => {
                const option = document.createElement('option');
                option.value = survey.id;
                option.textContent = survey.title || 'סקר ללא כותרת';
                surveySelect.appendChild(option);
            });
        }

        // Load analytics for selected survey
        async function loadSurveyAnalytics() {
            const surveySelect = document.getElementById('surveySelect');
            const selectedSurveyId = surveySelect.value;
            
            if (!selectedSurveyId) {
                showAnalyticsPlaceholder();
                return;
            }

            try {
                // Find the selected survey data
                const survey = window.userSurveys.find(s => s.id == selectedSurveyId);
                if (!survey) {
                    showNotification('שגיאה', 'לא נמצאו נתונים לסקר זה');
                    return;
                }

                currentSurveyData = survey;
                displaySurveyAnalytics(survey);
                
            } catch (error) {
                console.error('Error loading survey analytics:', error);
                showNotification('שגיאה', 'שגיאה בטעינת נתוני הסקר');
            }
        }

        // Display survey analytics
        function displaySurveyAnalytics(survey) {
            const analyticsContent = document.getElementById('analyticsContent');
            const analyticsPlaceholder = document.getElementById('analyticsPlaceholder');
            
            if (analyticsContent && analyticsPlaceholder) {
                analyticsContent.style.display = 'block';
                analyticsPlaceholder.style.display = 'none';
            }

            // Update header
            const titleElement = document.getElementById('selectedSurveyTitle');
            if (titleElement) {
                titleElement.textContent = survey.title || 'סקר ללא כותרת';
            }

            // Update stats
            const totalResponsesElement = document.getElementById('totalResponses');
            const surveyDateElement = document.getElementById('surveyDate');
            
            if (totalResponsesElement) {
                const totalVotes = survey.answers ? survey.answers.reduce((sum, answer) => sum + (answer.votes || 0), 0) : 0;
                totalResponsesElement.textContent = totalVotes;
            }
            
            if (surveyDateElement) {
                const creationDate = survey.createdAt || survey.created_at;
                const formattedDate = creationDate ? new Date(creationDate).toLocaleDateString('he-IL') : 'תאריך לא ידוע';
                surveyDateElement.textContent = formattedDate;
            }

            // Create charts
            createPieChart(survey);
            createLineChart(survey);
            
            // Update answers breakdown
            updateAnswersBreakdown(survey);
        }

        // Create pie chart for answer distribution
        function createPieChart(survey) {
            const canvas = document.getElementById('pieChart');
            if (!canvas || !survey.answers) return;

            // Check if Chart.js is available
            if (typeof Chart === 'undefined') {
                console.error('Chart.js is not loaded');
                canvas.innerHTML = '<div style="color: #64748b; padding: 20px;">Chart.js לא זמין</div>';
                return;
            }

            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (pieChart) {
                pieChart.destroy();
            }

            const labels = survey.answers.map(answer => answer.text || answer);
            const data = survey.answers.map(answer => answer.votes || 0);
            const colors = generateChartColors(data.length);

            try {
                pieChart = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: data,
                            backgroundColor: colors,
                            borderColor: colors.map(color => color.replace('0.8', '1')),
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: '#ffffff',
                                    font: {
                                        size: 12
                                    }
                                }
                            }
                        }
                    }
                });
            } catch (error) {
                console.error('Error creating pie chart:', error);
                canvas.innerHTML = '<div style="color: #64748b; padding: 20px;">שגיאה ביצירת הגרף</div>';
            }
        }

        // Create line chart for responses over time
        function createLineChart(survey) {
            const canvas = document.getElementById('lineChart');
            if (!canvas) return;

            // Check if Chart.js is available
            if (typeof Chart === 'undefined') {
                console.error('Chart.js is not loaded');
                canvas.innerHTML = '<div style="color: #64748b; padding: 20px;">Chart.js לא זמין</div>';
                return;
            }

            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (lineChart) {
                lineChart.destroy();
            }

            // Generate sample time data (since we don't have actual time data)
            const totalVotes = survey.answers ? survey.answers.reduce((sum, answer) => sum + (answer.votes || 0), 0) : 0;
            const timeLabels = ['יום 1', 'יום 2', 'יום 3', 'יום 4', 'יום 5', 'יום 6', 'יום 7'];
            const timeData = generateTimeSeriesData(totalVotes);

            try {
                lineChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: timeLabels,
                        datasets: [{
                            label: 'תשובות',
                            data: timeData,
                            borderColor: '#6366f1',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#ffffff',
                                font: {
                                    size: 12
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: '#64748b'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        },
                        y: {
                            ticks: {
                                color: '#64748b'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        }
                    }
                }
            });
            } catch (error) {
                console.error('Error creating line chart:', error);
                canvas.innerHTML = '<div style="color: #64748b; padding: 20px;">שגיאה ביצירת הגרף</div>';
            }
        }

        // Update answers breakdown
        function updateAnswersBreakdown(survey) {
            const breakdownContainer = document.getElementById('answersBreakdown');
            if (!breakdownContainer || !survey.answers) return;

            const totalVotes = survey.answers.reduce((sum, answer) => sum + (answer.votes || 0), 0);
            
            breakdownContainer.innerHTML = survey.answers.map(answer => {
                const votes = answer.votes || 0;
                const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
                
                return `
                    <div class="answer-item">
                        <div class="answer-text">${answer.text || answer}</div>
                        <div class="answer-stats">
                            <span>${votes} תשובות</span>
                            <span class="answer-percentage">${percentage}%</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Generate chart colors
        function generateChartColors(count) {
            const colors = [
                'rgba(99, 102, 241, 0.8)',   // Primary
                'rgba(139, 92, 246, 0.8)',   // Secondary
                'rgba(236, 72, 153, 0.8)',   // Accent
                'rgba(16, 185, 129, 0.8)',   // Success
                'rgba(245, 158, 11, 0.8)',   // Warning
                'rgba(239, 68, 68, 0.8)'     // Danger
            ];
            
            const result = [];
            for (let i = 0; i < count; i++) {
                result.push(colors[i % colors.length]);
            }
            return result;
        }

        // Generate time series data for line chart
        function generateTimeSeriesData(totalVotes) {
            const data = [];
            let remaining = totalVotes;
            
            for (let i = 0; i < 7; i++) {
                if (i === 6) {
                    data.push(remaining);
                } else {
                    const dayVotes = Math.floor(Math.random() * Math.min(remaining, Math.ceil(totalVotes / 3)));
                    data.push(dayVotes);
                    remaining -= dayVotes;
                }
            }
            
            return data;
        }

        // Show analytics placeholder
        function showAnalyticsPlaceholder() {
            const analyticsContent = document.getElementById('analyticsContent');
            const analyticsPlaceholder = document.getElementById('analyticsPlaceholder');
            
            if (analyticsContent && analyticsPlaceholder) {
                analyticsContent.style.display = 'none';
                analyticsPlaceholder.style.display = 'block';
            }
        }

        // Export survey data to Excel
        function exportSurveyData() {
            if (!currentSurveyData) {
                showNotification('שגיאה', 'לא נבחר סקר לייצוא');
                return;
            }
            
            // Create CSV content
            const csvContent = createCSVContent(currentSurveyData);
            
            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${currentSurveyData.title || 'survey'}_data.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification('ייצוא', 'הנתונים יוצאו בהצלחה');
        }

        // Export survey data to PDF
        function exportSurveyPDF() {
            if (!currentSurveyData) {
                showNotification('שגיאה', 'לא נבחר סקר לייצוא');
                return;
            }
            
            showNotification('ייצוא PDF', 'פונקציונליות זו תתווסף בקרוב');
        }

        // Create CSV content for export
        function createCSVContent(survey) {
            const headers = ['תשובה', 'מספר תשובות', 'אחוז'];
            const rows = [];
            
            if (survey.answers) {
                const totalVotes = survey.answers.reduce((sum, answer) => sum + (answer.votes || 0), 0);
                
                survey.answers.forEach(answer => {
                    const votes = answer.votes || 0;
                    const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
                    rows.push([answer.text || answer, votes, `${percentage}%`]);
                });
            }
            
            const csvContent = [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');
            
            return csvContent;
        }

        // Initialize analytics when user surveys are loaded
        function initializeAnalytics() {
            if (window.userSurveys && window.userSurveys.length > 0) {
                populateSurveySelector(window.userSurveys);
            }
        }

        // Call initialize analytics after user data is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeAnalytics);
        } else {
            initializeAnalytics();
        }

        // Also initialize analytics when surveys are loaded (in case they're loaded after page load)
        window.initializeAnalyticsFromSurveys = function(surveys) {
            if (surveys && surveys.length > 0) {
                window.userSurveys = surveys;
                populateSurveySelector(surveys);
            }
        };
    </script>
</body>
</html>