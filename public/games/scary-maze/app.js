const mazeBorders = document.querySelector(".maze-border");
const nextBtn = document.querySelector(".next-btn");

// assets
const ghost = document.querySelector(".ghost");
const scream = document.querySelector(".scream");

// levels
const levelOne = document.querySelector(".level-one");
const levelTwo = document.querySelector(".level-two");

let CheckCollision=(check)=>{
    if(check==="maze-border"){
        alert("You lost...Try again");
    }
    if(check==="finish"){
        nextBtn.style.opacity = 1;
        nextBtn.style.pointerEvents = "all";
        levelOne.style.pointerEvents = "none";
    }
    if(check === "end-game"){
        scream.play();
        ghost.style.display = "block";
        document.body.style.backgroundColor = "black";
    }
}

window.addEventListener("mousemove", (e)=>{
    let check = e.target.classList.value;
    CheckCollision(check);
});

nextBtn.addEventListener("click", ()=>{
    levelOne.style.display = "none";
    levelTwo.style.display = "inline-block";
    nextBtn.style.opacity = 0;
    nextBtn.style.pointerEvents = "none";
})

