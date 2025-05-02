document.addEventListener('DOMContentLoaded', function() {
    // 駅データ（駅名と時刻情報を含む）
    const stations = [
        { id: 1, name: '東　京', departure: '15:37', arrival: null, current: true, isFirst: true },
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

    // 通過駅の通過時刻を計算する関数
    function calculatePassingTime(fromStation, passingStation, toStation) {
        // 前の駅の発車時刻と次の駅の到着時刻を取得
        const departureTime = timeToMs(fromStation.departure);
        let arrivalTime = null;
        
        // 通過駅の次の駅の到着時刻を取得
        if (toStation && toStation.arrival) {
            arrivalTime = timeToMs(toStation.arrival);
        } else {
            // 次の駅の到着時刻が不明な場合、通過駅の次の次の駅を探す
            for (let i = stations.indexOf(passingStation) + 1; i < stations.length; i++) {
                if (stations[i] && stations[i].arrival) {
                    arrivalTime = timeToMs(stations[i].arrival);
                    break;
                }
            }
        }
        
        if (!departureTime || !arrivalTime) {
            return null; // 計算に必要な時刻が不足している場合
        }
        
        // 通過駅までの距離比率（単純に駅間を等間隔と仮定）
        const ratio = 0.5; // 中間点として計算
        
        // 通過時刻を計算
        let passingTimeMs = departureTime + (arrivalTime - departureTime) * ratio;
        
        // 通過時刻をフォーマット
        const hours = Math.floor(passingTimeMs / 3600000);
        const minutes = Math.floor((passingTimeMs % 3600000) / 60000);
        const seconds = Math.floor((passingTimeMs % 60000) / 1000);
        
        if (seconds > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
    }

    // 効果音を再生する関数
    function playSound(soundType) {
        // サウンドタイプによって異なる効果音を再生する
        const sound = new Audio();
        
        switch(soundType) {
            case 'select-first':
                sound.src = 'audio.mp3'; // 発車駅選択用の音声ファイル
                break;
            case 'select-last':
                sound.src = 'audio.mp3'; // 終着駅選択用の音声ファイル
                break;
            case 'toggle':
                sound.src = 'audio.mp3'; // 選択解除などの切り替え音
                break;
            default:
                sound.src = 'audio.mp3'; // デフォルトの効果音
        }
        
        // フォールバックとしてブラウザ内蔵の音声合成APIを使用（ファイルがない場合）
        sound.onerror = function() {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(soundType === 'select-first' ? '始発' : '終着');
                utterance.lang = 'ja-JP';
                utterance.volume = 0.5;
                speechSynthesis.speak(utterance);
            } else {
                console.log('サウンドファイルの読み込みに失敗し、音声合成APIもサポートされていません');
            }
        };
        
        // 音量調整
        sound.volume = 0.5;
        
        // 再生
        sound.play().catch(e => {
            console.log('音声再生エラー:', e);
        });
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
                            showContinuationDialog();
                            return;
                        }
                        
                        // 通過駅の通過時刻を計算
                        const nextNextStation = stations[currentStationIndex + 1];
                        const passingTime = calculatePassingTime(fromStation, nextStation, nextNextStation);
                        
                        if (passingTime) {
                            console.log(`${nextStation.name} 通過時刻: ${passingTime}`);
                            // 必要に応じて通過時刻を表示（デバッグや表示のため）
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
                                showContinuationDialog();
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

    // アニメーション終了時に継続確認ダイアログを表示する関数
    function showContinuationDialog() {
        // 確認ダイアログの作成
        const dialogOverlay = document.createElement('div');
        dialogOverlay.className = 'dialog-overlay';
        
        const dialogBox = document.createElement('div');
        dialogBox.className = 'dialog-box';
        dialogBox.innerHTML = `
            <div class="dialog-content">
                <h3>反復処理を続行しますか?</h3>
                <div class="dialog-buttons">
                    <button class="btn btn-yes">はい</button>
                    <button class="btn btn-no">いいえ</button>
                </div>
            </div>
        `;
        
        // ダイアログをDOMに追加
        dialogOverlay.appendChild(dialogBox);
        document.body.appendChild(dialogOverlay);
        
        // ボタンのイベントリスナーを設定
        const yesButton = dialogBox.querySelector('.btn-yes');
        const noButton = dialogBox.querySelector('.btn-no');
        
        yesButton.addEventListener('click', function() {
            // ダイアログを閉じる
            document.body.removeChild(dialogOverlay);
            // アニメーションを最初から再開
            restartAnimation();
        });
        
        noButton.addEventListener('click', function() {
            // ダイアログを閉じるだけ
            document.body.removeChild(dialogOverlay);
        });
    }

    // アニメーションを最初から再開する関数
    function restartAnimation() {
        // 初期状態にリセット
        resetDisplay();
        // ONラベルをアクティブに
        const onLabel = document.querySelector('.on-label');
        const offLabel = document.querySelector('.off-label');
        onLabel.classList.add('active');
        offLabel.classList.remove('active');
        // アニメーション開始
        setTimeout(() => {
            locationType = 'between-stations';
            betweenStationsProgress = 0;
            animateBetweenStations(currentStationIndex);
        }, 1000);
    }

    // アニメーションを開始する
    function startAnimation() {
        // 既存のアニメーションがあれば停止
        stopAnimation();
        
        // 初期状態をリセット
        resetDisplay();
        
        // 現在の始発駅のインデックスを取得
        currentStationIndex = stations.findIndex(station => station.isFirst);
        if (currentStationIndex === -1) {
            currentStationIndex = 0; // 始発駅が見つからない場合は東京駅から
        }

        // 始発駅より前の駅を通過済みとして記録
        for (let i = 0; i < currentStationIndex; i++) {
            passedStations.push(stations[i].id);
            const stationRow = document.querySelector(`.station-row[data-station-id="${stations[i].id}"]`);
            if (stationRow) {
                stationRow.classList.add('passed');
            }
        }
        
        // 位置を更新して表示
        updateCurrentLocation();
        
        // アニメーション開始
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
        currentStationIndex = stations.findIndex(station => station.isFirst);
        if (currentStationIndex === -1) {
            currentStationIndex = 0;
        }
        locationType = 'at-station';
        passedStations = []; // 通過した駅のリストをクリア
        
        // 始発駅より前の駅は通過済みとして記録
        for (let i = 0; i < currentStationIndex; i++) {
            passedStations.push(stations[i].id);
            const stationRow = document.querySelector(`.station-row[data-station-id="${stations[i].id}"]`);
            if (stationRow) {
                stationRow.classList.add('passed');
            }
        }
        
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

    // 駅の表示を更新する関数
    function updateStationsVisibility() {
        let terminalFound = false;
        let firstStationFound = false;
        
        // 駅の表示/非表示を設定
        stations.forEach(station => {
            const stationRow = document.querySelector(`.station-row[data-station-id="${station.id}"]`);
            if (stationRow) {
                // 始発駅より前は非表示
                if (!firstStationFound) {
                    if (station.isFirst) {
                        firstStationFound = true;
                        stationRow.style.display = '';
                    } else {
                        stationRow.style.display = 'none';
                    }
                }
                // 終着駅より後は非表示
                else if (terminalFound) {
                    stationRow.style.display = 'none';
                } else {
                    stationRow.style.display = '';
                }
                
                if (station.isLast) {
                    terminalFound = true;
                }
            }
        });
    }

    // 終着駅を設定する関数
    function setTerminalStation(stationId) {
        const newTerminal = stations.find(s => s.id === stationId);
        if (!newTerminal) return;

        if (newTerminal.isLast) {
            // すでに終着駅の場合は解除
            newTerminal.isLast = false;
            const stationRow = document.querySelector(`.station-row[data-station-id="${stationId}"]`);
            if (stationRow) {
                const departureCell = stationRow.querySelector('.departure');
                if (departureCell) {
                    // 元の発時刻を復元
                    if (newTerminal.departure) {
                        // HTML要素として設定
                        if (newTerminal.departure.split(':')[2]) {
                            departureCell.innerHTML = newTerminal.departure.split(':')[1] + '<sub>' + newTerminal.departure.split(':')[2] + '</sub>';
                        } else {
                            departureCell.innerHTML = newTerminal.departure.split(':')[1];
                        }
                    } else if (!newTerminal.passing) {
                        departureCell.innerHTML = '';
                    }
                }
            }
            // 効果音を再生（選択解除）
            playSound('toggle');
            
            // 熱海を終着駅に戻す
            const lastStation = stations.find(s => s.id === 22);
            if (lastStation) {
                lastStation.isLast = true;
                const lastStationRow = document.querySelector(`.station-row[data-station-id="22"]`);
                if (lastStationRow) {
                    const departureCell = lastStationRow.querySelector('.departure');
                    if (departureCell) {
                        departureCell.innerHTML = '====';
                    }
                }
            }
        } else {
            // すべての駅の終着表示をリセット
            stations.forEach(station => {
                station.isLast = false;
                const stationRow = document.querySelector(`.station-row[data-station-id="${station.id}"]`);
                if (stationRow) {
                    const departureCell = stationRow.querySelector('.departure');
                    if (departureCell) {
                        // 元の発時刻を復元
                        if (station.departure) {
                            // HTML要素として設定
                            if (station.departure.split(':')[2]) {
                                departureCell.innerHTML = station.departure.split(':')[1] + '<sub>' + station.departure.split(':')[2] + '</sub>';
                            } else {
                                departureCell.innerHTML = station.departure.split(':')[1];
                            }
                        } else if (!station.passing) {
                            departureCell.innerHTML = '';
                        }
                    }
                }
            });

            // 新しい終着駅を設定
            newTerminal.isLast = true;
            // 終着駅の発時刻を "====" に変更
            const stationRow = document.querySelector(`.station-row[data-station-id="${stationId}"]`);
            if (stationRow) {
                const departureCell = stationRow.querySelector('.departure');
                if (departureCell) {
                    departureCell.innerHTML = '====';
                }
            }
            
            // 効果音を再生（終着駅選択）
            playSound('select-last');
        }

        // 終着駅以降の駅の表示を更新
        updateStationsVisibility();
    }

    // 始発駅を設定する関数
    function setFirstStation(stationId) {
        const newFirst = stations.find(s => s.id === stationId);
        if (!newFirst) return;

        if (newFirst.isFirst) {
            // すでに始発駅の場合は解除
            newFirst.isFirst = false;
            const stationRow = document.querySelector(`.station-row[data-station-id="${stationId}"]`);
            if (stationRow) {
                const arrivalCell = stationRow.querySelector('.arrival');
                if (arrivalCell) {
                    // 到着時刻を復元
                    if (newFirst.arrival) {
                        if (newFirst.arrival.split(':')[2]) {
                            arrivalCell.innerHTML = newFirst.arrival.split(':')[1] + '<sub>' + newFirst.arrival.split(':')[2] + '</sub>';
                        } else {
                            arrivalCell.innerHTML = newFirst.arrival.split(':')[1];
                        }
                    } else if (!newFirst.passing) {
                        arrivalCell.innerHTML = '';
                    }
                }
            }
            
            // 効果音を再生（選択解除）
            playSound('toggle');
            
            // 東京駅を始発駅に戻す
            const firstStation = stations.find(s => s.id === 1);
            if (firstStation) {
                firstStation.isFirst = true;
                const firstStationRow = document.querySelector(`.station-row[data-station-id="1"]`);
                if (firstStationRow) {
                    const arrivalCell = firstStationRow.querySelector('.arrival');
                    if (arrivalCell) {
                        arrivalCell.innerHTML = '';
                    }
                }
            }
        } else {
            // すべての駅の始発表示をリセット
            stations.forEach(station => {
                station.isFirst = false;
                const stationRow = document.querySelector(`.station-row[data-station-id="${station.id}"]`);
                if (stationRow) {
                    const arrivalCell = stationRow.querySelector('.arrival');
                    if (arrivalCell) {
                        // 到着時刻を復元
                        if (station.arrival) {
                            if (station.arrival.split(':')[2]) {
                                arrivalCell.innerHTML = station.arrival.split(':')[1] + '<sub>' + station.arrival.split(':')[2] + '</sub>';
                            } else {
                                arrivalCell.innerHTML = station.arrival.split(':')[1];
                            }
                        } else if (!station.passing) {
                            arrivalCell.innerHTML = '';
                        }
                    }
                }
            });

            // 新しい始発駅を設定
            newFirst.isFirst = true;
            // 始発駅の到着時刻を空に
            const stationRow = document.querySelector(`.station-row[data-station-id="${stationId}"]`);
            if (stationRow) {
                const arrivalCell = stationRow.querySelector('.arrival');
                if (arrivalCell) {
                    arrivalCell.innerHTML = '';
                }
            }
            
            // 効果音を再生（始発駅選択）
            playSound('select-first');
        }

        // 駅の表示を更新
        updateStationsVisibility();
    }

    // 駅のクリックイベントを設定
    document.querySelectorAll('.station-row').forEach(row => {
        const arrivalCell = row.querySelector('.arrival');
        const departureCell = row.querySelector('.departure');
        
        if (arrivalCell) {
            arrivalCell.addEventListener('click', function(e) {
                e.stopPropagation(); // イベントの伝播を止める
                const stationId = parseInt(row.dataset.stationId);
                const station = stations.find(s => s.id === stationId);
                
                // 通過駅でない場合のみ始発駅として設定可能
                if (station && !station.passing) {
                    setFirstStation(stationId);
                }
            });
        }
        
        if (departureCell) {
            departureCell.addEventListener('click', function(e) {
                e.stopPropagation(); // イベントの伝播を止める
                const stationId = parseInt(row.dataset.stationId);
                const station = stations.find(s => s.id === stationId);
                
                // 通過駅でない場合のみ終着駅として設定可能
                if (station && !station.passing) {
                    setTerminalStation(stationId);
                }
            });
        }
    });

    // 初期表示を設定
    updateCurrentLocation();

    // 初期表示時にも終着駅以降の駅の表示を更新
    updateStationsVisibility();

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

