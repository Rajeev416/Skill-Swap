import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Request } from "../models/request.model.js";
import { UnRegisteredUser } from "../models/unRegisteredUser.model.js";
import { generateJWTToken_username } from "../utils/generateJWTToken.js";
import { uploadOnCloudinary } from "../config/connectCloudinary.js";
import { sendMail } from "../utils/SendMail.js";

export const userDetailsWithoutID = asyncHandler(async (req, res) => {
  console.log("\n******** Inside userDetailsWithoutID Controller function ********");

  return res.status(200).json(new ApiResponse(200, req.user, "User details fetched successfully"));
});

export const UserDetails = asyncHandler(async (req, res) => {
  console.log("\n******** Inside UserDetails Controller function ********");
  const username = req.params.username;

  // Performance Optimization: If the user is fetching their OWN profile,
  // we already have their data stored in req.user from the JWT middleware.
  if (username === req.user.username) {
    return res
      .status(200)
      .json(new ApiResponse(200, { ...req.user._doc, status: "Self" }, "User details fetched successfully"));
  }

  const user = await User.findOne({ username: username });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const receiverID = user._id;
  const senderID = req.user._id;
  const request = await Request.find({
    $or: [
      { sender: senderID, receiver: receiverID },
      { sender: receiverID, receiver: senderID },
    ],
  });

  // console.log("request", request);

  const status = request.length > 0 ? request[0].status : "Connect";

  // console.log(" userDetail: ", userDetail);
  // console.log("user", user);
  return res
    .status(200)
    .json(new ApiResponse(200, { ...user._doc, status: status }, "User details fetched successfully"));
});

export const UnRegisteredUserDetails = asyncHandler(async (req, res) => {
  console.log("\n******** Inside UnRegisteredUserDetails Controller function ********");

  // console.log(" UnRegisteredUserDetail: ", userDetail);
  return res.status(200).json(new ApiResponse(200, req.user, "User details fetched successfully"));
});

export const saveRegUnRegisteredUser = asyncHandler(async (req, res) => {
  console.log("\n******** Inside saveRegUnRegisteredUser Controller function ********");

  const { name, email, username, linkedinLink, githubLink, portfolioLink, skillsProficientAt, skillsToLearn } =
    req.body;
  // console.log("Body: ", req.body);

  if (!name || !email || !username || skillsProficientAt.length === 0 || skillsToLearn.length === 0) {
    throw new ApiError(400, "Please provide all the details");
  }

  if (!email.match(/^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+$/)) {
    throw new ApiError(400, "Please provide valid email");
  }

  if (username.length < 3) {
    throw new ApiError(400, "Username should be atleast 3 characters long");
  }

  if (githubLink === "" && linkedinLink === "" && portfolioLink === "") {
    throw new ApiError(400, "Please provide atleast one link");
  }

  const githubRegex = /^(?:http(?:s)?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+(?:\/)?$/;
  const linkedinRegex = /^(?:http(?:s)?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+(?:\/)?$/;
  if ((linkedinLink && !linkedinLink.match(linkedinRegex)) || (githubLink && !githubLink.match(githubRegex))) {
    throw new ApiError(400, "Please provide valid github and linkedin links");
  }

  const existingUser = await User.findOne({ username: username });

  if (existingUser) {
    throw new ApiError(400, "Username already exists");
  }

  const user = await UnRegisteredUser.findOneAndUpdate(
    { email: email },
    {
      name: name,
      username: username,
      linkedinLink: linkedinLink,
      githubLink: githubLink,
      portfolioLink: portfolioLink,
      skillsProficientAt: skillsProficientAt,
      skillsToLearn: skillsToLearn,
    }
  );

  if (!user) {
    throw new ApiError(500, "Error in saving user details");
  }
  // console.log(" UnRegisteredUserDetail: ", userDetail);
  return res.status(200).json(new ApiResponse(200, user, "User details saved successfully"));
});

export const saveEduUnRegisteredUser = asyncHandler(async (req, res) => {
  console.log("******** Inside saveEduUnRegisteredUser Function *******");

  const { education, email } = req.body;
  if (education.length === 0) {
    throw new ApiError(400, "Education is required");
  }
  education.forEach((edu) => {
    // console.log("Education: ", edu);
    if (!edu.institution || !edu.degree) {
      throw new ApiError(400, "Please provide all the details");
    }
    if (
      !edu.startDate ||
      !edu.endDate ||
      !edu.score ||
      edu.score < 0 ||
      edu.score > 100 ||
      edu.startDate > edu.endDate
    ) {
      throw new ApiError(400, "Please provide valid score and dates");
    }
  });

  const user = await UnRegisteredUser.findOneAndUpdate({ email: email }, { education: education });

  if (!user) {
    throw new ApiError(500, "Error in saving user details");
  }

  return res.status(200).json(new ApiResponse(200, user, "User details saved successfully"));
});

export const saveAddUnRegisteredUser = asyncHandler(async (req, res) => {
  console.log("******** Inside saveAddUnRegisteredUser Function *******");

  const { bio, projects, email } = req.body;
  if (!bio) {
    throw new ApiError(400, "Bio is required");
  }
  if (bio.length > 500) {
    throw new ApiError(400, "Bio should be less than 500 characters");
  }

  if (projects.size > 0) {
    projects.forEach((project) => {
      if (!project.title || !project.description || !project.projectLink || !project.startDate || !project.endDate) {
        throw new ApiError(400, "Please provide all the details");
      }
      if (project.projectLink.match(/^(http|https):\/\/[^ "]+$/)) {
        throw new ApiError(400, "Please provide valid project link");
      }
      if (project.startDate > project.endDate) {
        throw new ApiError(400, "Please provide valid dates");
      }
    });
  }

  const user = await UnRegisteredUser.findOneAndUpdate({ email: email }, { bio: bio, projects: projects });

  if (!user) {
    throw new ApiError(500, "Error in saving user details");
  }

  return res.status(200).json(new ApiResponse(200, user, "User details saved successfully"));
});

export const registerUser = async (req, res) => {
  console.log("\n******** Inside registerUser function ********");
  // First check if the user is already registered
  // if the user is already registerd than send a message that the user is already registered
  // redirect him to the discover page
  // if the user is not registered than create a new user and redirect him to the discover page after generating the token and setting the cookie and also delete the user detail from unregistered user from the database
  console.log("User:", req.user);

  const {
    name,
    email,
    username,
    linkedinLink,
    githubLink,
    portfolioLink,
    skillsProficientAt,
    skillsToLearn,
    education,
    bio,
    projects,
  } = req.body;

  if (!name || !email || !username || skillsProficientAt.length === 0 || skillsToLearn.length === 0) {
    throw new ApiError(400, "Please provide all the details");
  }
  if (!email.match(/^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+$/)) {
    throw new ApiError(400, "Please provide valid email");
  }
  if (username.length < 3) {
    throw new ApiError(400, "Username should be atleast 3 characters long");
  }
  if (githubLink === "" && linkedinLink === "" && portfolioLink === "") {
    throw new ApiError(400, "Please provide atleast one link");
  }
  const githubRegex = /^(?:http(?:s)?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+(?:\/)?$/;
  const linkedinRegex = /^(?:http(?:s)?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+(?:\/)?$/;
  if ((linkedinLink && !linkedinLink.match(linkedinRegex)) || (githubLink && !githubLink.match(githubRegex))) {
    throw new ApiError(400, "Please provide valid github and linkedin links");
  }
  if (education.length === 0) {
    throw new ApiError(400, "Education is required");
  }
  education.forEach((edu) => {
    if (!edu.institution || !edu.degree) {
      throw new ApiError(400, "Please provide all the details");
    }
    if (
      !edu.startDate ||
      !edu.endDate ||
      !edu.score ||
      edu.score < 0 ||
      edu.score > 100 ||
      edu.startDate > edu.endDate
    ) {
      throw new ApiError(400, "Please provide valid score and dates");
    }
  });
  if (!bio) {
    throw new ApiError(400, "Bio is required");
  }
  if (bio.length > 500) {
    throw new ApiError(400, "Bio should be less than 500 characters");
  }
  if (projects.size > 0) {
    projects.forEach((project) => {
      if (!project.title || !project.description || !project.projectLink || !project.startDate || !project.endDate) {
        throw new ApiError(400, "Please provide all the details");
      }
      if (project.projectLink.match(/^(http|https):\/\/[^ "]+$/)) {
        throw new ApiError(400, "Please provide valid project link");
      }
      if (project.startDate > project.endDate) {
        throw new ApiError(400, "Please provide valid dates");
      }
    });
  }

  const existingUser = await User.findOne({ email: email });

  if (existingUser) {
    throw new ApiError(400, "User Already registered");
  }

  const checkUsername = await User.findOne({ username: username });
  if (checkUsername) {
    throw new ApiError(400, "Username already exists");
  }

  const newUser = await User.create({
    name: name,
    email: email,
    username: username,
    linkedinLink: linkedinLink,
    githubLink: githubLink,
    portfolioLink: portfolioLink,
    skillsProficientAt: skillsProficientAt,
    skillsToLearn: skillsToLearn,
    education: education,
    bio: bio,
    projects: projects,
    picture: req.user.picture,
    password: req.user.password,
  });

  if (!newUser) {
    throw new ApiError(500, "Error in saving user details");
  }

  await UnRegisteredUser.findOneAndDelete({ email: email });

  const jwtToken = generateJWTToken_username(newUser);
  const expiryDate = new Date(Date.now() + 1 * 60 * 60 * 1000);
  res.cookie("accessToken", jwtToken, { httpOnly: true, expires: expiryDate, secure: false });
  res.clearCookie("accessTokenRegistration");
  return res.status(200).json(new ApiResponse(200, newUser, "NewUser registered successfully"));
};

export const saveRegRegisteredUser = asyncHandler(async (req, res) => {
  console.log("******** Inside saveRegRegisteredUser Function *******");

  const { name, username, linkedinLink, githubLink, portfolioLink, skillsProficientAt, skillsToLearn, picture } =
    req.body;

  console.log("Body: ", req.body);

  if (!name || !username || skillsProficientAt.length === 0 || skillsToLearn.length === 0) {
    throw new ApiError(400, "Please provide all the details");
  }

  if (username.length < 3) {
    throw new ApiError(400, "Username should be atleast 3 characters long");
  }

  if (githubLink === "" && linkedinLink === "" && portfolioLink === "") {
    throw new ApiError(400, "Please provide atleast one link");
  }

  const githubRegex = /^(?:http(?:s)?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+(?:\/)?$/;
  const linkedinRegex = /^(?:http(?:s)?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+(?:\/)?$/;
  if ((linkedinLink && !linkedinLink.match(linkedinRegex)) || (githubLink && !githubLink.match(githubRegex))) {
    throw new ApiError(400, "Please provide valid github and linkedin links");
  }

  const user = await User.findOneAndUpdate(
    { username: req.user.username },
    {
      name: name,
      username: username,
      linkedinLink: linkedinLink,
      githubLink: githubLink,
      portfolioLink: portfolioLink,
      skillsProficientAt: skillsProficientAt,
      skillsToLearn: skillsToLearn,
      picture: picture,
    },
    { new: true }
  );

  if (!user) {
    throw new ApiError(500, "Error in saving user details");
  }

  return res.status(200).json(new ApiResponse(200, user, "User details saved successfully"));
});

export const saveEduRegisteredUser = asyncHandler(async (req, res) => {
  console.log("******** Inside saveEduRegisteredUser Function *******");

  const { education } = req.body;

  if (education.length === 0) {
    throw new ApiError(400, "Education is required");
  }

  education.forEach((edu) => {
    if (!edu.institution || !edu.degree) {
      throw new ApiError(400, "Please provide all the details");
    }
    if (
      !edu.startDate ||
      !edu.endDate ||
      !edu.score ||
      edu.score < 0 ||
      edu.score > 100 ||
      edu.startDate > edu.endDate
    ) {
      throw new ApiError(400, "Please provide valid score and dates");
    }
  });

  const user = await User.findOneAndUpdate({ username: req.user.username }, { education: education }, { new: true });

  if (!user) {
    throw new ApiError(500, "Error in saving user details");
  }

  return res.status(200).json(new ApiResponse(200, user, "User details saved successfully"));
});

export const saveAddRegisteredUser = asyncHandler(async (req, res) => {
  console.log("******** Inside saveAddRegisteredUser Function *******");

  const { bio, projects } = req.body;

  if (!bio) {
    throw new ApiError(400, "Bio is required");
  }

  if (bio.length > 500) {
    throw new ApiError(400, "Bio should be less than 500 characters");
  }

  if (projects.size > 0) {
    projects.forEach((project) => {
      if (!project.title || !project.description || !project.projectLink || !project.startDate || !project.endDate) {
        throw new ApiError(400, "Please provide all the details");
      }
      if (project.projectLink.match(/^(http|https):\/\/[^ "]+$/)) {
        throw new ApiError(400, "Please provide valid project link");
      }
      if (project.startDate > project.endDate) {
        throw new ApiError(400, "Please provide valid dates");
      }
    });
  }

  const user = await User.findOneAndUpdate({ username: req.user.username }, { bio: bio, projects: projects }, { new: true });

  if (!user) {
    throw new ApiError(500, "Error in saving user details");
  }

  return res.status(200).json(new ApiResponse(200, user, "User details saved successfully"));
});

// export const updateRegisteredUser = asyncHandler(async (req, res) => {
//   console.log("******** Inside updateRegisteredUser Function *******");

//   const {
//     name,
//     username,
//     linkedinLink,
//     githubLink,
//     portfolioLink,
//     skillsProficientAt,
//     skillsToLearn,
//     education,
//     bio,
//     projects,
//   } = req.body;

//   if (!name || !username || skillsProficientAt.length === 0 || skillsToLearn.length === 0) {
//     throw new ApiError(400, "Please provide all the details");
//   }

//   if (username.length < 3) {
//     throw new ApiError(400, "Username should be atleast 3 characters long");
//   }

//   if (githubLink === "" && linkedinLink === "" && portfolioLink === "") {
//     throw new ApiError(400, "Please provide atleast one link");
//   }

//   const githubRegex = /^(?:http(?:s)?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+(?:\/)?$/;
//   const linkedinRegex = /^(?:http(?:s)?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+(?:\/)?$/;
//   if ((linkedinLink && !linkedinLink.match(linkedinRegex)) || (githubLink && !githubLink.match(githubRegex))) {
//     throw new ApiError(400, "Please provide valid github and linkedin links");
//   }

//   if (education.length === 0) {
//     throw new ApiError(400, "Education is required");
//   }

//   education.forEach((edu) => {
//     if (!edu.institution || !edu.degree) {
//       throw new ApiError(400, "Please provide all the details");
//     }
//     if (
//       !edu.startDate ||
//       !edu.endDate ||
//       !edu.score ||
//       edu.score < 0 ||
//       edu.score > 100 ||
//       edu.startDate > edu.endDate
//     ) {
//       throw new ApiError(400, "Please provide valid score and dates");
//     }
//   });

//   if (!bio) {
//     throw new ApiError(400, "Bio is required");
//   }

//   if (bio.length > 500) {
//     throw new ApiError(400, "Bio should be less than 500 characters");
//   }

//   if (projects.size > 0) {
//     projects.forEach((project) => {
//       if (!project.title || !project.description || !project.projectLink || !project.startDate || !project.endDate) {
//         throw new ApiError(400, "Please provide all the details");
//       }
//       if (project.projectLink.match(/^(http|https):\/\/[^ "]+$/)) {
//         throw new ApiError(400, "Please provide valid project link");
//       }
//       if (project.startDate > project.endDate) {
//         throw new ApiError(400, "Please provide valid dates");
//       }
//     });
//   }

//   const user = await User.findOneAndUpdate(
//     { username: req.user.username },
//     {
//       name: name,
//       username: username,
//       linkedinLink: linkedinLink,
//       githubLink: githubLink,
//       portfolioLink: portfolioLink,
//       skillsProficientAt: skillsProficientAt,
//       skillsToLearn: skillsToLearn,
//       education: education,
//       bio: bio,
//       projects: projects,
//     }
//   );

//   if (!user) {
//     throw new ApiError(500, "Error in saving user details");
//   }

//   return res.status(200).json(new ApiResponse(200, user, "User details saved successfully"));
// });

export const uploadPic = asyncHandler(async (req, res) => {
  const LocalPath = req.files?.picture[0]?.path;

  if (!LocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }
  
  try {
    const picture = await uploadOnCloudinary(LocalPath);
    if (!picture) {
      throw new ApiError(500, "Cloudinary upload returned null or failed internally.");
    }
    res.status(200).json(new ApiResponse(200, { url: picture.url }, "Picture uploaded successfully"));
  } catch (error) {
    throw new ApiError(500, `Cloudinary error: ${error.message} - Path: ${LocalPath}`);
  }
});

export const discoverUsers = asyncHandler(async (req, res) => {
  console.log("******** Inside discoverUsers Function *******");

  const webDevSkills = [
    "HTML",
    "CSS",
    "JavaScript",
    "React",
    "Angular",
    "Vue",
    "Node.js",
    "Express",
    "MongoDB",
    "SQL",
    "NoSQL",
  ];

  const machineLearningSkills = [
    "Python",
    "Natural Language Processing",
    "Deep Learning",
    "PyTorch",
    "Machine Learning",
  ];

  // Find all the users except the current users who are proficient in the skills that the current user wants to learn and also the the users who are proficient in the web development skills and machine learning skills in the array above
  //

  //  fetch all users except the current user

  const users = await User.find({ username: { $ne: req.user.username } });

  // now make three seperate list of the users who are proficient in the skills that the current user wants to learn, the users who are proficient in the web development skills and the users who are proficient in the machine learning skills and others also limit the size of the array to 5;

  // const users = await User.find({
  //   skillsProficientAt: { $in: req.user.skillsToLearn },
  //   username: { $ne: req.user.username },
  // });

  if (!users) {
    throw new ApiError(500, "Error in fetching users");
  }
  const usersToLearn = [];
  const webDevUsers = [];
  const mlUsers = [];
  const otherUsers = [];

  // randomly suffle the users array

  users.sort(() => Math.random() - 0.5);

  users.forEach((user) => {
    if (user.skillsProficientAt.some((skill) => req.user.skillsToLearn.includes(skill)) && usersToLearn.length < 5) {
      usersToLearn.push(user);
    } else if (user.skillsProficientAt.some((skill) => webDevSkills.includes(skill)) && webDevUsers.length < 5) {
      webDevUsers.push(user);
    } else if (user.skillsProficientAt.some((skill) => machineLearningSkills.includes(skill)) && mlUsers.length < 5) {
      mlUsers.push(user);
    } else {
      if (otherUsers.length < 5) otherUsers.push(user);
    }
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { forYou: usersToLearn, webDev: webDevUsers, ml: mlUsers, others: otherUsers },
        "Users fetched successfully"
      )
    );
});

export const sendScheduleMeet = asyncHandler(async (req, res) => {
  console.log("******** Inside sendScheduleMeet Function *******");

  const { date, time, username } = req.body;
  if (!date || !time || !username) {
    throw new ApiError(400, "Please provide all the details");
  }

  const receiver = await User.findOne({ username: username });

  if (!receiver) {
    throw new ApiError(404, "User not found");
  }

  const senderName = req.user.name;
  const senderUsername = req.user.username;
  const senderEmail = req.user.email;
  const to = receiver.email;
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Convert time to 12-hour format
  const [hours, minutes] = time.split(":");
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedTime = `${hours % 12 || 12}:${minutes} ${ampm}`;

  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
  const acceptUrl = `${backendUrl}/user/meetResponse?action=accept&senderEmail=${encodeURIComponent(senderEmail)}&senderName=${encodeURIComponent(senderName)}&receiverName=${encodeURIComponent(receiver.name)}&date=${encodeURIComponent(formattedDate)}&time=${encodeURIComponent(formattedTime)}`;
  const declineUrl = `${backendUrl}/user/meetResponse?action=decline&senderEmail=${encodeURIComponent(senderEmail)}&senderName=${encodeURIComponent(senderName)}&receiverName=${encodeURIComponent(receiver.name)}&date=${encodeURIComponent(formattedDate)}&time=${encodeURIComponent(formattedTime)}`;

  const subject = `📅 Video Call Request from ${senderName} — SkillSwap`;

  const htmlMessage = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #2d2d2d 0%, #1a1a2e 100%); padding:32px 40px; text-align:center;">
                <h1 style="margin:0; color:#3BB4A1; font-size:28px; font-weight:700; letter-spacing:1px;">SkillSwap</h1>
                <p style="margin:8px 0 0; color:#9ca3af; font-size:13px; text-transform:uppercase; letter-spacing:2px;">Video Call Request</p>
              </td>
            </tr>
            
            <!-- Body -->
            <tr>
              <td style="padding:40px;">
                <p style="margin:0 0 8px; color:#6b7280; font-size:14px;">Hello,</p>
                <h2 style="margin:0 0 24px; color:#1f2937; font-size:22px; font-weight:600;">
                  ${senderName} would like to connect with you!
                </h2>
                
                <!-- Meeting Details Card -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; margin-bottom:32px;">
                  <tr>
                    <td style="padding:24px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-bottom:16px;">
                            <p style="margin:0; color:#9ca3af; font-size:11px; text-transform:uppercase; letter-spacing:1.5px; font-weight:600;">Requested By</p>
                            <p style="margin:4px 0 0; color:#1f2937; font-size:16px; font-weight:600;">${senderName} <span style="color:#9ca3af; font-weight:400;">(@${senderUsername})</span></p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom:16px; border-top:1px solid #e5e7eb; padding-top:16px;">
                            <p style="margin:0; color:#9ca3af; font-size:11px; text-transform:uppercase; letter-spacing:1.5px; font-weight:600;">📅 Proposed Date</p>
                            <p style="margin:4px 0 0; color:#1f2937; font-size:16px; font-weight:500;">${formattedDate}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="border-top:1px solid #e5e7eb; padding-top:16px;">
                            <p style="margin:0; color:#9ca3af; font-size:11px; text-transform:uppercase; letter-spacing:1.5px; font-weight:600;">⏰ Proposed Time</p>
                            <p style="margin:4px 0 0; color:#1f2937; font-size:16px; font-weight:500;">${formattedTime}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                
                <!-- Action Buttons -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="padding-bottom:12px;">
                      <a href="${acceptUrl}" style="display:inline-block; background-color:#3BB4A1; color:#ffffff; text-decoration:none; padding:14px 48px; border-radius:8px; font-size:16px; font-weight:600; letter-spacing:0.5px;">
                        ✅ Accept Meeting
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <a href="${declineUrl}" style="display:inline-block; background-color:#ef4444; color:#ffffff; text-decoration:none; padding:14px 48px; border-radius:8px; font-size:16px; font-weight:600; letter-spacing:0.5px;">
                        ❌ Decline Meeting
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background-color:#f9fafb; padding:24px 40px; border-top:1px solid #e5e7eb; text-align:center;">
                <p style="margin:0; color:#9ca3af; font-size:12px;">
                  This is an automated message from <strong style="color:#3BB4A1;">SkillSwap</strong>. 
                  Please do not reply to this email directly.
                </p>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;

  const emailSent = await sendMail(to, subject, htmlMessage);
  if (!emailSent) {
    throw new ApiError(500, "Failed to send the email. Please try again later.");
  }

  return res.status(200).json(new ApiResponse(200, null, "Email sent successfully"));
});

// Handle meeting accept/decline from email link
export const handleMeetResponse = asyncHandler(async (req, res) => {
  console.log("******** Inside handleMeetResponse Function *******");

  const { action, senderEmail, senderName, receiverName, date, time } = req.query;

  if (!action || !senderEmail || !senderName || !receiverName) {
    throw new ApiError(400, "Invalid meeting response link");
  }

  const isAccepted = action === "accept";
  const statusText = isAccepted ? "Accepted ✅" : "Declined ❌";
  const statusColor = isAccepted ? "#3BB4A1" : "#ef4444";
  const statusMessage = isAccepted
    ? `Great news! ${receiverName} has accepted your video call request.`
    : `${receiverName} has declined your video call request.`;

  // Send notification email to the requester
  const subject = `Meeting ${isAccepted ? "Accepted" : "Declined"} — ${receiverName} | SkillSwap`;

  const notificationHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #2d2d2d 0%, #1a1a2e 100%); padding:32px 40px; text-align:center;">
                <h1 style="margin:0; color:#3BB4A1; font-size:28px; font-weight:700; letter-spacing:1px;">SkillSwap</h1>
                <p style="margin:8px 0 0; color:#9ca3af; font-size:13px; text-transform:uppercase; letter-spacing:2px;">Meeting Response</p>
              </td>
            </tr>
            
            <!-- Body -->
            <tr>
              <td style="padding:40px; text-align:center;">
                <div style="display:inline-block; background-color:${statusColor}; color:#ffffff; padding:10px 28px; border-radius:50px; font-size:14px; font-weight:600; letter-spacing:1px; margin-bottom:24px;">
                  ${statusText}
                </div>
                <h2 style="margin:24px 0 16px; color:#1f2937; font-size:22px; font-weight:600;">
                  ${statusMessage}
                </h2>
                ${date && time ? `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; margin:24px 0;">
                  <tr>
                    <td style="padding:20px; text-align:center;">
                      <p style="margin:0 0 4px; color:#9ca3af; font-size:11px; text-transform:uppercase; letter-spacing:1.5px;">Meeting Details</p>
                      <p style="margin:8px 0 0; color:#1f2937; font-size:16px;"><strong>📅</strong> ${date} &nbsp;&nbsp; <strong>⏰</strong> ${time}</p>
                    </td>
                  </tr>
                </table>
                ` : ""}
                ${isAccepted ? `<p style="margin:0; color:#6b7280; font-size:14px;">You can now coordinate further details through SkillSwap chat.</p>` : `<p style="margin:0; color:#6b7280; font-size:14px;">You can suggest a different time through SkillSwap chat.</p>`}
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background-color:#f9fafb; padding:24px 40px; border-top:1px solid #e5e7eb; text-align:center;">
                <p style="margin:0; color:#9ca3af; font-size:12px;">
                  This is an automated message from <strong style="color:#3BB4A1;">SkillSwap</strong>.
                </p>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;

  await sendMail(senderEmail, subject, notificationHtml);

  // Show a confirmation page to the person who clicked the button
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const confirmationHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meeting ${isAccepted ? "Accepted" : "Declined"} — SkillSwap</title>
  </head>
  <body style="margin:0; padding:0; background-color:#1a1a2e; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display:flex; justify-content:center; align-items:center; min-height:100vh;">
    <div style="text-align:center; padding:60px 40px; background:#2d2d2d; border-radius:16px; max-width:480px; margin:40px auto; box-shadow:0 8px 32px rgba(0,0,0,0.3);">
      <h1 style="color:#3BB4A1; font-size:32px; margin:0 0 8px;">SkillSwap</h1>
      <div style="font-size:48px; margin:24px 0;">${isAccepted ? "🎉" : "👋"}</div>
      <h2 style="color:#ffffff; font-size:24px; margin:0 0 16px;">
        Meeting ${isAccepted ? "Accepted!" : "Declined"}
      </h2>
      <p style="color:#9ca3af; font-size:16px; margin:0 0 32px;">
        ${isAccepted
          ? `You have accepted the meeting with ${senderName}. A confirmation email has been sent to them.`
          : `You have declined the meeting with ${senderName}. They have been notified.`
        }
      </p>
      <a href="${frontendUrl}" style="display:inline-block; background-color:#3BB4A1; color:#ffffff; text-decoration:none; padding:14px 36px; border-radius:8px; font-size:16px; font-weight:600;">
        Open SkillSwap
      </a>
    </div>
  </body>
  </html>`;

  res.setHeader("Content-Type", "text/html");
  return res.status(200).send(confirmationHtml);
});
