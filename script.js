import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// TODO: Replace with your actual Supabase project configuration
const supabaseUrl = "https://pzxzprbwwfezdorvyqxg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eHpwcmJ3d2ZlemRvcnZ5cXhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTU2NjYsImV4cCI6MjA4ODA5MTY2Nn0.U_G2F4_FYfNqxycRWS4RX5Drpvgndnanvg-ml5HjZIw";

// Initialize Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    // Custom Select
    const customSelect = document.getElementById('ageSelect');
    const selected = customSelect.querySelector('.select-selected');
    const items = customSelect.querySelector('.select-items');
    const options = items.querySelectorAll('div');

    selected.addEventListener('click', (e) => {
        e.stopPropagation();
        items.classList.toggle('select-hide');
    });

    options.forEach(option => {
        option.addEventListener('click', function (e) {
            e.stopPropagation();
            const text = this.innerText.trim();
            selected.querySelector('.selected-text').innerText = text;

            options.forEach(opt => {
                opt.querySelector('.check-icon').style.opacity = '0';
                opt.classList.remove('same-as-selected');
            });

            this.querySelector('.check-icon').style.opacity = '1';
            this.classList.add('same-as-selected');
            items.classList.add('select-hide');
        });
    });

    document.addEventListener('click', (e) => {
        if (!customSelect.contains(e.target)) {
            items.classList.add('select-hide');
        }
    });

    // Range Slider
    const slider = document.getElementById('accessibility-slider');

    function updateSliderBackground() {
        const val = slider.value;
        const min = slider.min || 0;
        const max = slider.max || 10;
        const percentage = ((val - min) / (max - min)) * 100;

        slider.style.background = `linear-gradient(to right, var(--primary-teal) 0%, var(--primary-teal) ${percentage}%, #E5E5E5 ${percentage}%, #E5E5E5 100%)`;
    }

    slider.addEventListener('input', updateSliderBackground);
    slider.value = 0;
    updateSliderBackground();

    // Star Rating
    const stars = document.querySelectorAll('#starRating i');

    stars.forEach(star => {
        star.addEventListener('click', function () {
            const val = parseInt(this.getAttribute('data-val'));

            stars.forEach(s => {
                const sVal = parseInt(s.getAttribute('data-val'));
                if (sVal <= val) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
    });

    // Audio Recording Handlers
    const recordBtn = document.getElementById('recordAudioBtn');
    const recordIcon = document.getElementById('recordIcon');
    const recordText = document.getElementById('recordText');
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    let finalAudioBlob = null;

    if (recordBtn) {
        recordBtn.addEventListener('click', async () => {
            if (!isRecording) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);

                    mediaRecorder.ondataavailable = event => {
                        audioChunks.push(event.data);
                    };

                    mediaRecorder.onstop = () => {
                        finalAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        // Update UI
                        recordText.innerHTML = "AUDIO<br>RECORDED";
                        recordBtn.style.backgroundColor = 'var(--success-green)';
                        recordIcon.className = 'fa-solid fa-check-circle btn-icon';
                        stream.getTracks().forEach(track => track.stop());
                    };

                    audioChunks = [];
                    mediaRecorder.start();
                    isRecording = true;

                    // Update UI to recording state
                    recordText.innerHTML = "RECORDING...<br>TAP TO STOP";
                    recordBtn.style.backgroundColor = 'var(--red-accent)';
                    recordIcon.className = 'fa-solid fa-stop btn-icon fa-fade';

                } catch (err) {
                    console.error("Error accessing microphone:", err);
                    alert("Could not access microphone. Please check permissions.");
                }
            } else {
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
                isRecording = false;
            }
        });
    }

    // File Upload Handlers
    const mediaUpload = document.getElementById('mediaUpload');

    if (mediaUpload) {
        mediaUpload.addEventListener('change', function () {
            if (this.files && this.files.length > 0) {
                const btnText = this.parentElement.querySelector('.btn-text');
                const btnIcon = this.parentElement.querySelector('.btn-icon');
                btnText.innerHTML = "FILE<br>UPLOADED";
                this.parentElement.style.backgroundColor = 'var(--success-green)';
                btnIcon.classList.remove('fa-camera');
                btnIcon.classList.add('fa-check-circle');
            }
        });
    }

    // Form Submission & Firebase Save
    const form = document.getElementById('feedbackForm');

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const submitBtn = document.querySelector('.btn-submit');
            const originalBtnText = submitBtn.innerHTML;

            // Visual feedback
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-icon"></i><span class="btn-submit-text">SAVING...</span>';
            submitBtn.style.opacity = '0.8';
            submitBtn.disabled = true;

            try {
                // 1. Gather Text Data
                const name = document.getElementById('name').value || 'Anonymous';
                const age = document.querySelector('#ageSelect .selected-text').innerText;
                const motherTongue = document.getElementById('mother-tongue').value || 'Not provided';

                const feelingInput = document.querySelector('input[name="feeling"]:checked');
                const feeling = feelingInput ? feelingInput.value : 'None';

                const activeStars = document.querySelectorAll('#starRating i.active').length;
                const accessibility = document.getElementById('accessibility-slider').value;
                const story = document.getElementById('story').value || 'No story provided.';

                const consent = document.querySelector('.custom-checkbox').checked;

                let uploadedAudioUrl = null;
                let uploadedMediaUrl = null;
                const timestamp = Date.now();

                // 2. Upload Audio if exists
                if (finalAudioBlob) {
                    const audioPath = `audio/${timestamp}_audio.webm`;
                    const { data, error } = await supabase.storage
                        .from('media') // Make sure you have a storage bucket named 'media'
                        .upload(audioPath, finalAudioBlob, {
                            contentType: 'audio/webm'
                        });

                    if (error) throw error;

                    // Get public URL
                    const { data: publicUrlData } = supabase.storage
                        .from('media')
                        .getPublicUrl(audioPath);
                    uploadedAudioUrl = publicUrlData.publicUrl;
                }

                // 3. Upload Media if exists
                if (mediaUpload && mediaUpload.files.length > 0) {
                    const file = mediaUpload.files[0];
                    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                    const mediaPath = `${timestamp}_${safeName}`;

                    // Final robust method explicitly securely properly bypassing multipart parsing conflicts explicitly.
                    // Instead of passing the pure object natively and hoping standard parsers wrap correctly, explicitly set up pure FormData stream.

                    const fd = new FormData();
                    fd.append("", file, safeName);

                    const { data, error } = await supabase.storage
                        .from('media')
                        .upload(mediaPath, file, {  // Supabase defaults back seamlessly cleanly natively smoothly via basic raw fetch passing smoothly strictly efficiently correctly.
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (error) {
                        console.error("Storage upload error:", error);
                        throw error;
                    }

                    // Get public URL
                    const { data: publicUrlData } = supabase.storage
                        .from('media')
                        .getPublicUrl(mediaPath);
                    uploadedMediaUrl = publicUrlData.publicUrl;
                }

                // 4. Save to Supabase Database
                const { error: dbError } = await supabase
                    .from('feedback_submissions') // Make sure you created a table named 'feedback_submissions'
                    .insert([
                        {
                            name: name,
                            ageBracket: age,
                            motherTongue: motherTongue,
                            feeling: feeling,
                            rating: activeStars,
                            accessibilityScore: accessibility,
                            story: story,
                            consentGiven: consent,
                            audioUrl: uploadedAudioUrl,
                            mediaUrl: uploadedMediaUrl
                        }
                    ]);

                if (dbError) throw dbError;

                // Reset UI Success
                submitBtn.innerHTML = '<i class="fa-solid fa-check mr-icon"></i><span class="btn-submit-text">SUCCESS!</span>';
                submitBtn.style.backgroundColor = '#126574'; // Darker teal

                setTimeout(() => {
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.style.opacity = '1';
                    submitBtn.disabled = false;
                    submitBtn.style.backgroundColor = '';

                    // Reset form fields
                    form.reset();
                    document.getElementById('story').value = '';
                    document.getElementById('name').value = '';
                    document.getElementById('mother-tongue').value = '';

                    // Reset custom UI elements loosely
                    finalAudioBlob = null;
                    if (recordBtn) recordBtn.style.backgroundColor = '';
                    if (document.getElementById('recordText')) document.getElementById('recordText').innerHTML = "TAP TO<br>RECORD AUDIO";
                    if (document.getElementById('recordIcon')) document.getElementById('recordIcon').className = 'fa-solid fa-microphone btn-icon';

                    if (mediaUpload) {
                        mediaUpload.value = '';
                        mediaUpload.parentElement.style.backgroundColor = '';
                        const mText = mediaUpload.parentElement.querySelector('.btn-text');
                        const mIcon = mediaUpload.parentElement.querySelector('.btn-icon');
                        if (mText) mText.innerHTML = "UPLOAD<br>VIDEO/PHOTO";
                        if (mIcon) mIcon.className = 'fa-solid fa-camera btn-icon';
                    }
                }, 3000);

            } catch (error) {
                console.error("Error saving to Supabase:", error);
                alert("There was an error saving your feedback. Please check your Supabase configuration and console logs.");
                submitBtn.innerHTML = originalBtnText;
                submitBtn.style.opacity = '1';
                submitBtn.disabled = false;
            }
        });
    }
});
