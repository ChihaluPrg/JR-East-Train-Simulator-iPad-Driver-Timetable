document.addEventListener('DOMContentLoaded', function() {
    // 駅データ（駅名と時刻情報を含む）
    const stations = [
        { id: 1, name: '東　京', departure: '15:37', arrival: null, current: true },
        { id: 2, name: '新　橋', departure: '15:40', arrival: '15:39:30' },
        { id: 3, name: '品　川', departure: '15:45', arrival: '15:44:30' },
        { id: 4, name: '川　崎', departure: '15:53:45', arrival: '15:53:15' },
        { id: 5, name: '鶴　見', departure: '15:56:15', arrival: null, passing: true },
        { id: 6, name: '横　浜', departure: '16:02:15', arrival: '16:01:15' },
        { id: 7, name: '戸　塚', departure: '16:12:15', arrival: '16:11:30' },
        { id: 8, name: '大　船', departure: '16:17:30', arrival: '16:17' },
        { id: 9, name: '藤　沢', departure: '16:22', arrival: '16:21:30' },
        { id: 10, name: '辻　堂', departure: null, arrival: null, passing: true },
        { id: 11, name: '茅ヶ崎', departure: '16:27:30', arrival: '16:27' },
        { id: 12, name: '平　塚', departure: '16:32:15', arrival: '16:31:45' },
        { id: 13, name: '大　磯', departure: null, arrival: null, passing: true },
        { id: 14, name: '二　宮', departure: null, arrival: null, passing: true },
        { id: 15, name: '国府津', departure: '16:42', arrival: '16:41' },
        { id: 16, name: '鴨　宮', departure: null, arrival: null, passing: true },
        { id: 17, name: '小田原', departure: '16:48', arrival: '16:47' },
        { id: 18, name: '早　川', departure: '16:50:45', arrival: '16:50:15' },
        { id: 19, name: '根府川', departure: '16:55:30', arrival: '16:55' },
        { id: 20, name: '真　鶴', departure: '17:00:45', arrival: '17:00:15' },
        { id: 21, name: '湯河原', departure: '17:04:30', arrival: '17:04' },
        { id: 22, name: '熱　海', departure: null, arrival: '17:11', isLast: true }
    ];

    // アニメーション設定
    const ANIMATION_DURATION = 1500; // CSSアニメーションの時間（ミリ秒）
    const TIME_SCALE = 1; // 時間のスケール（実時間と同じ速度で表示）

    // 現在の位置インデックスと位置状態（駅にいるか、駅間か）
    let currentStationIndex = 0; // 0から始まるインデックス（東京 = 0）
    let locationType = 'at-station'; // 'at-station' または 'between-stations'
    let betweenStationsProgress = 0; // 駅間の進行度合い（0～1）
    let animationTimer = null; // アニメーションタイマー

    // 通過した駅を記録する配列
    let passedStations = [];

    // 時間文字列をミリ秒に変換する関数
    function timeToMs(timeStr) {
        if (!timeStr) return null;
        
        // 時間形式を分析（HH:MM または HH:MM:SS）
        const parts = timeStr.split(':');
        let hours = 0, minutes = 0, seconds = 0;
        
        if (parts.length === 3) {
            hours = parseInt(parts[0]);
            minutes = parseInt(parts[1]);
            seconds = parseInt(parts[2]);
        } else if (parts.length === 2) {
            hours = parseInt(parts[0]);
            minutes = parseInt(parts[1]);
        }
        
        // 合計ミリ秒を計算
        return (hours * 3600 + minutes * 60 + seconds) * 1000;
    }

    // 駅間の移動時間を計算する関数
    function calculateTravelTime(fromStation, toStation) {
        if (!fromStation.departure || !toStation.arrival) {
            return 5000; // デフォルト値
        }
        
        const departureTime = timeToMs(fromStation.departure);
        const arrivalTime = timeToMs(toStation.arrival);
        
        // 到着時間が出発時間よりも小さい場合（日付が変わる場合）
        if (arrivalTime < departureTime) {
            return (arrivalTime + 24 * 60 * 60 * 1000) - departureTime;
        }
        
        return arrivalTime - departureTime;
    }

    // 駅での停車時間を計算する関数
    function calculateStopTime(station) {
        if (!station.arrival || !station.departure) {
            return 2000; // デフォルト値
        }
        
        const arrivalTime = timeToMs(station.arrival);
        const departureTime = timeToMs(station.departure);
        
        // 出発時間が到着時間よりも小さい場合（日付が変わる場合）
        if (departureTime < arrivalTime) {
            return (departureTime + 24 * 60 * 60 * 1000) - arrivalTime;
        }
        
        return departureTime - arrivalTime;
    }

    // 現在位置の表示を更新する関数
    function updateCurrentLocation() {
        // まず既存のマーカーをすべて削除
        cleanupDisplay();

        // 現在位置オーバーレイを取得
        const currentLocationOverlay = document.querySelector('.current-location-overlay');
        
        if (locationType === 'at-station') {
            // 駅にいる場合の表示
            const currentStationRow = document.querySelector(`.station-row[data-station-id="${stations[currentStationIndex].id}"]`);
            if (currentStationRow) {
                // 運転時分の要素を取得
                const operationTimeEl = currentStationRow.querySelector('.operation-time');
                if (operationTimeEl) {
                    // 駅では運転時分を緑色の背景に - 駅にいるときのみ表示
                    const greenHighlight = document.createElement('div');
                    greenHighlight.className = 'current-operation-time';
                    operationTimeEl.appendChild(greenHighlight);
                    
                    // 運転時分の正方形表示も駅にいるときのみ表示
                    const square = document.createElement('div');
                    square.className = 'operation-time-square';
                    operationTimeEl.appendChild(square);

                    // 現在の駅をハイライト
                    document.querySelectorAll('.station-row').forEach(row => {
                        row.classList.remove('current');
                    });
                    currentStationRow.classList.add('current');
                }
            }
        } else if (locationType === 'between-stations') {
            // 駅間にいる場合の表示
            const fromStationRow = document.querySelector(`.station-row[data-station-id="${stations[currentStationIndex].id}"]`);
            const toStationRow = document.querySelector(`.station-row[data-station-id="${stations[currentStationIndex + 1].id}"]`);
            
            if (fromStationRow && toStationRow) {
                // 上下の駅の位置と高さを取得
                const fromRect = fromStationRow.getBoundingClientRect();
                const toRect = toStationRow.getBoundingClientRect();
                
                // スクロール位置を考慮した絶対位置を計算
                const fromStationPosition = fromRect.top + window.scrollY;
                const fromStationHeight = fromRect.height;
                const toStationPosition = toRect.top + window.scrollY;

                // 駅間の位置を計算
                const totalDistance = toStationPosition - (fromStationPosition + fromStationHeight);
                const currentPosition = fromStationPosition + fromStationHeight + (totalDistance * betweenStationsProgress);

                // 横棒を追加（緑色） - 駅間にいる時のみ表示
                const bar = document.createElement('div');
                bar.className = 'station-bar';
                bar.style.top = `${currentPosition}px`;
                bar.style.width = '100%';
                bar.style.zIndex = '5';
                currentLocationOverlay.appendChild(bar);
                
                // 緑色の正方形マーカーを追加（運転時分列の位置に合わせる）- 駅間にいる時のみ表示
                const marker = document.createElement('div');
                marker.className = 'between-stations-marker';
                marker.style.top = `${currentPosition}px`;
                marker.style.zIndex = '6';
                currentLocationOverlay.appendChild(marker);

                // すべての駅のハイライトを解除
                document.querySelectorAll('.station-row').forEach(row => {
                    row.classList.remove('current');
                });
            }
        }

        // 通過した駅の表示を更新
        updatePassedStations();
    }

    // 通過した駅を更新する関数
    function updatePassedStations() {
        // 現在のインデックスより前の駅に「passed」クラスを追加
        for (let i = 0; i < stations.length; i++) {
            const stationRow = document.querySelector(`.station-row[data-station-id="${stations[i].id}"]`);
            if (stationRow) {
                if (i < currentStationIndex) {
                    // まだ「passed」クラスが付いていない駅のみアニメーションを適用
                    if (!passedStations.includes(stations[i].id) && !stationRow.classList.contains('passed')) {
                        stationRow.classList.add('passed');
                        passedStations.push(stations[i].id); // 通過した駅として記録
                    }
                } else {
                    // 前方の駅は「passed」クラスを持たない
                    stationRow.classList.remove('passed');
                    // パスした駅リストから削除する（リセット時などに必要）
                    const index = passedStations.indexOf(stations[i].id);
                    if (index !== -1) {
                        passedStations.splice(index, 1);
                    }
                }
            }
        }
    }

    // 駅間のアニメーション
    function animateBetweenStations(fromStationIndex) {
        const fromStation = stations[fromStationIndex];
        const toStation = stations[fromStationIndex + 1];
        
        if (!fromStation || !toStation) return;
        
        // 駅間の移動時間を計算（ミリ秒）
        const travelTime = calculateTravelTime(fromStation, toStation);
        // スケールを適用（TIME_SCALEの倍速で表示）
        const scaledTravelTime = travelTime / TIME_SCALE;
        
        console.log(`${fromStation.name}から${toStation.name}への移動: ${travelTime}ms (実時間), ${scaledTravelTime}ms (スケール適用)`);
        
        // 移動開始時刻を記録
        const startTime = Date.now();
        
        // アニメーションを更新するためのタイマー
        animationTimer = setInterval(() => {
            // 経過時間を計算
            const elapsedTime = Date.now() - startTime;
            // 進行度を計算（0～1）
            betweenStationsProgress = Math.min(elapsedTime / scaledTravelTime, 1);
            
            // 位置を更新
            updateCurrentLocation();
            
            // アニメーション完了判定
            if (betweenStationsProgress >= 1) {
                clearInterval(animationTimer);
                
                // 次の駅に到着
                currentStationIndex++;
                locationType = 'at-station';
                
                // 次の駅がある場合、その駅での停車を開始
                if (currentStationIndex < stations.length) {
                    const nextStation = stations[currentStationIndex];
                    
                    // スクロールして現在位置を表示
                    const currentStationRow = document.querySelector(`.station-row[data-station-id="${nextStation.id}"]`);
                    if (currentStationRow) {
                        currentStationRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    
                    updateCurrentLocation();
                    
                    // 通過駅の場合は停車せずに次の区間へ
                    if (nextStation.passing || !nextStation.departure) {
                        // 最後の駅の場合はアニメーション終了
                        if (nextStation.isLast) {
                            return;
                        }
                        
                        // わずかな遅延を入れて次の区間へ
                        setTimeout(() => {
                            locationType = 'between-stations';
                            betweenStationsProgress = 0;
                            animateBetweenStations(currentStationIndex);
                        }, 500);
                    } else {
                        // 停車時間を計算
                        const stopTime = calculateStopTime(nextStation);
                        const scaledStopTime = stopTime / TIME_SCALE;
                        
                        console.log(`${nextStation.name}での停車: ${stopTime}ms (実時間), ${scaledStopTime}ms (スケール適用)`);
                        
                        // 停車時間後に次の区間へ
                        setTimeout(() => {
                            // 最後の駅の場合はアニメーション終了
                            if (nextStation.isLast) {
                                return;
                            }
                            
                            locationType = 'between-stations';
                            betweenStationsProgress = 0;
                            animateBetweenStations(currentStationIndex);
                        }, scaledStopTime);
                    }
                }
            }
        }, 50); // 滑らかなアニメーションのためにこまめに更新
    }

    // アニメーションを開始する
    function startAnimation() {
        // 既存のアニメーションがあれば停止
        stopAnimation();
        
        // 初期状態をリセット
        resetDisplay();
        
        // 最初の駅からアニメーション開始
        setTimeout(() => {
            locationType = 'between-stations';
            betweenStationsProgress = 0;
            animateBetweenStations(currentStationIndex);
        }, 1000); // 少し待ってからスタート
    }

    // アニメーションを停止する
    function stopAnimation() {
        if (animationTimer) {
            clearInterval(animationTimer);
            animationTimer = null;
        }
    }

    // 表示をリセットする関数
    function resetDisplay() {
        // すべての駅のハイライトをクリア
        document.querySelectorAll('.station-row').forEach(row => {
            row.classList.remove('current');
            row.classList.remove('passed');
        });
        
        // オーバーレイをクリア
        const overlay = document.querySelector('.current-location-overlay');
        if (overlay) {
            overlay.innerHTML = '';
        }
        
        // すべての駅から動的に追加された要素を削除
        cleanupDisplay();
        
        // 現在の状態をリセット
        currentStationIndex = 0; // 東京に戻す
        locationType = 'at-station';
        passedStations = []; // 通過した駅のリストをクリア
        
        // 初期表示を設定
        updateCurrentLocation();
    }

    // 既存の表示をクリーンアップする関数
    function cleanupDisplay() {
        // すべての駅から動的に追加された要素を削除（駅にいるとき用の要素）
        document.querySelectorAll('.operation-time-square, .current-operation-time').forEach(el => {
            el.remove();
        });
        
        // オーバーレイ（駅間にいるとき用の要素）もクリア
        const overlay = document.querySelector('.current-location-overlay');
        if (overlay) {
            overlay.innerHTML = '';
        }
    }

    // 初期表示を設定
    updateCurrentLocation();

    // アプリケーションの初期化
    function init() {
        // ON/OFFトグルの処理
        const onLabel = document.querySelector('.on-label');
        const offLabel = document.querySelector('.off-label');
        
        onLabel.addEventListener('click', function() {
            onLabel.classList.add('active');
            offLabel.classList.remove('active');
            startAnimation(); // アニメーション開始
        });
        
        offLabel.addEventListener('click', function() {
            offLabel.classList.add('active');
            onLabel.classList.remove('active');
            stopAnimation(); // アニメーション停止
            resetDisplay(); // 表示をリセット
        });

        // メニュー項目の切り替え処理
        const menuItems = document.querySelectorAll('.nav-item');
        menuItems.forEach(item => {
            item.addEventListener('click', function() {
                menuItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
            });
        });

        // 現在日付を更新
        updateCurrentDate();
    }

    // 現在日付の表示を更新
    function updateCurrentDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString();
        const day = now.getDate().toString();
        
        const dateElement = document.querySelector('.current-date');
        if (dateElement) {
            dateElement.textContent = `${year}年${month}月${day}日`;
        }
    }

    // アプリケーションの初期化を実行
    init();
});

