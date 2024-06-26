import React, { useEffect, useState } from "react";
import Dashboard from "./dashboard";
import styles from "./conductors.module.css";
import { IconPlus, IconX, IconDownload } from "@tabler/icons-react";
import Slide from "@mui/material/Slide";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import axios from "axios";
import EnforcementsCalendar from "./calendar";
import { useDispatch, useSelector } from "react-redux";
import { setRanks } from "../redux/ranksSlice";
import { setOfficiatorObject } from "../redux/officiatorObjectsSlice";
import { newNotification } from "../redux/notificationSlice";
import Loading from "../customComponents/loader";
import Roster from "../customComponents/Roster";
import { clearOfficiatorObject } from "../redux/officiatorObjectsSlice";
import Feedback from "./feedback";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const ManageOfficiators = () => {
  const dispatch = useDispatch();

  // state for the dialog box
  const [open, setOpen] = React.useState(false);
  const handleDialogOpen = () => {
    setOpen(true);
  };
  const handleDialogClose = () => {
    setShowEnforcement(false);
    setOpen(false);
    setOfficiatorName("");
    setConductOnWeekday(false);
    setConductOnSunday(false);
    setReadOnWeekday(false);
    setReadOnSunday(false);
    setPreachOnWeekday(false);
    setPreachOnSunday(false);
    setEnforcementDate("");
    setEnforcementDay("");
  };

  // get rank data from BE
  const ranksFromRedux = useSelector((state) => state.ranks.ranks);

  useEffect(() => {
    if (ranksFromRedux === null) {
      const getAllRanks = async () => {
        try {
          const endpointToGetRank = `${process.env.REACT_APP_API_URL}/rankings`;
          const getRanks = await axios.get(endpointToGetRank);
          dispatch(setRanks(getRanks.data));
        } catch (error) {
          console.error("error from getting ranks", error);
        }
      };
      getAllRanks();
    }
  }, [ranksFromRedux, dispatch]);

  // state for the select
  const [rank, setRank] = React.useState("");
  const [officiation, setOfficition] = useState();

  const handleRankChange = (event) => {
    const selectedIndex = event.target.selectedIndex;
    const selectedRankObject = ranksFromRedux[selectedIndex - 1];
    setRank(selectedRankObject);
  };

  const handleOfficiationChange = (event) => {
    setOfficition(event.target.value);
  };

  // collecting all details of single or multiple officiators
  const [officiatorName, setOfficiatorName] = useState("");
  const [conductOnWeekday, setConductOnWeekday] = useState(false);
  const [conductOnSunday, setConductOnSunday] = useState(false);
  const [readOnWeekday, setReadOnWeekday] = useState(false);
  const [readOnSunday, setReadOnSunday] = useState(false);
  const [preachOnWeekday, setPreachOnWeekday] = useState(false);
  const [preachOnSunday, setPreachOnSunday] = useState(false);
  const [enforcementDate, setEnforcementDate] = useState("");
  const [enforcementDay, setEnforcementDay] = useState("");
  const [showEnforcement, setShowEnforcement] = useState(false);
  const handleShowEnforcement = () => {
    setShowEnforcement(!showEnforcement);
  };

  const handleDateFromCalendar = (date) => {
    setEnforcementDate(date);
  };

  const handleDayFromCalendar = (day) => {
    setEnforcementDay(day);
  };

  const createOfficiatorObject = {
    id: Math.floor(Math.random() * 1000000),
    name: officiatorName,
    rank: rank,
    can_conduct_on_weekdays: conductOnWeekday,
    can_conduct_on_sundays: conductOnSunday,
    can_read_on_weekdays: readOnWeekday,
    can_read_on_sundays: readOnSunday,
    can_preach_on_weekdays: preachOnWeekday,
    can_preach_on_sundays: preachOnSunday,
    enforcements: showEnforcement
      ? [
          {
            date: enforcementDate,
            service_type: enforcementDay === "Sun" ? "sunday" : "weekday",
            officiation: officiation,
          },
        ]
      : null,
  };

  // use this object to collect multiple officiators and pass them to the redux. it's the one in redux that is then sent with the endpoint below
  const handleAddNewOfficiator = () => {
    dispatch(setOfficiatorObject(createOfficiatorObject));
    handleDialogClose();
    setTimeout(() => {
      setOpen(true);
    }, 500);
  };

  // checking if a minimum of 5 officiators been entered
  const [disableSendButton, setDisableSendButton] = useState(true);
  const countOfOfficiators = useSelector(
    (state) => state.officiatorObject.collectOfficiatorObject.length
  );
  useEffect(() => {
    if (countOfOfficiators >= 5) {
      setDisableSendButton(false);
    }
  }, [countOfOfficiators]);

  // sending officiator data to the BE
  const [loading, setLoading] = useState(false);
  const username = useSelector((state) => state.auth.name);
  const useremail = useSelector((state) => state.auth.email);
  const createdOfficiatorDetails = useSelector(
    (state) => state.officiatorObject.collectOfficiatorObject
  );

  const handleSaveToRoster = async () => {
    dispatch(setOfficiatorObject(createOfficiatorObject));

    setLoading(true);
    const dataToSend = {
      temp_user: username,
      email: useremail,
      month: "April",
      year: "2024",
      bible_lesson_file: "bible_lessons_d.json",
      officiators: createdOfficiatorDetails,
    };
    console.log("data to send", JSON.stringify(dataToSend));
    try {
      const endpointToSendDetailsToRoster = `${process.env.REACT_APP_API_URL}/rosters/`;
      const responseFromSendingToRoster = await axios.post(
        endpointToSendDetailsToRoster,
        dataToSend
      );
      console.log(
        "confirming response from roster",
        responseFromSendingToRoster
      );
      if (responseFromSendingToRoster.status === 201) {
        setLoading(false);
        dispatch(
          newNotification({
            message: "Your roster has been successfully created.",
            backgroundColor: "success",
          })
        );
        setRosterData(responseFromSendingToRoster.data.roster);
        handleDialogClose();
        dispatch(clearOfficiatorObject());
      }
    } catch (error) {
      console.error("error sending details to roster", error);
      setLoading(false);
      dispatch(
        newNotification({
          message: "There was an error while saving to Roster. Try again.",
          backgroundColor: "failure",
        })
      );
      handleDialogClose();
      dispatch(clearOfficiatorObject());
    }
  };

  // setting roster data
  const [rosterData, setRosterData] = useState(null);

  // button used in testing to clear redux
  // const handleReduxClear = () => {
  //   dispatch(clearOfficiatorObject());
  // };

  const downloadPDF = () => {
    const targetElement = document.getElementById("target");
    const pdf = new jsPDF("landscape");

    html2canvas(targetElement, { width: 1280, height: 960 }).then((canvas) => {
      const imgData = canvas.toDataURL("img/png");
      const componentWidth = pdf.internal.pageSize.getWidth();
      const componentHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, componentWidth, componentHeight);
      pdf.save("roster.pdf");
    });
    dispatch(
      newNotification({
        message: "Download complete.",
        backgroundColor: "success",
      })
    );
  };

  return (
    <Dashboard>
      <div>
        <div>
          <h3 className={styles.title}>Manage Officiators</h3>
          <div onClick={handleDialogOpen} className={styles.createNew}>
            Create new officiator
          </div>
          {/* <p style={{ cursor: "pointer" }} onClick={handleReduxClear}>
            Clear redux (test)
          </p> */}
          <div>
            <Dialog
              open={open}
              TransitionComponent={Transition}
              //   onClose={handleDialogClose}
            >
              {/* <DialogTitle>{"Create new officiator"}</DialogTitle> */}
              <DialogContent style={{ position: "relative" }}>
                <IconX
                  className={styles.closeDialog}
                  onClick={handleDialogClose}
                />
                <section className={styles.dialogForm}>
                  <p className={styles.dialogTitles}>Create new officiator</p>
                  <div className={styles.persona}>
                    <div className={styles.personaInputContainer}>
                      <input
                        type="text"
                        placeholder="Enter officiator name"
                        onChange={(e) => setOfficiatorName(e.target.value)}
                      />
                    </div>
                    <div className={styles.personaSelectContainer}>
                      <select onChange={handleRankChange}>
                        <option disabled selected value="">
                          What's their rank...
                        </option>
                        {ranksFromRedux &&
                          ranksFromRedux.map((rank, index) => (
                            <option key={index}>{rank.name}</option>
                          ))}

                        <option></option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.checkboxOverallContainer}>
                    <p className={styles.dialogTitles}>Customize</p>
                    <div className={styles.customizationToSelect}>
                      <div className={styles.individualCheckboxContainer}>
                        <label>Can conduct on weekdays</label>
                        <input
                          value={conductOnWeekday}
                          type="checkbox"
                          onChange={(e) =>
                            setConductOnWeekday(e.target.checked)
                          }
                        />
                      </div>
                      <div className={styles.individualCheckboxContainer}>
                        <label>Can conduct on Sundays</label>
                        <input
                          type="checkbox"
                          onChange={(e) => setConductOnSunday(e.target.checked)}
                        />
                      </div>
                    </div>
                    <div className={styles.customizationToSelect}>
                      <div className={styles.individualCheckboxContainer}>
                        <label>Can read on weekdays</label>
                        <input
                          type="checkbox"
                          onChange={(e) => setReadOnWeekday(e.target.checked)}
                        />
                      </div>
                      <div className={styles.individualCheckboxContainer}>
                        <label>Can read on Sundays</label>
                        <input
                          type="checkbox"
                          onChange={(e) => setReadOnSunday(e.target.checked)}
                        />
                      </div>
                    </div>
                    <div className={styles.customizationToSelect}>
                      <div className={styles.individualCheckboxContainer}>
                        <label>Can preach on weekdays</label>
                        <input
                          type="checkbox"
                          onChange={(e) => setPreachOnWeekday(e.target.checked)}
                        />
                      </div>
                      <div className={styles.individualCheckboxContainer}>
                        <label>Can preach on Sundays</label>
                        <input
                          type="checkbox"
                          onChange={(e) => setPreachOnSunday(e.target.checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.addEnforcements}>
                    <p
                      className={styles.enforcementTitle}
                      onClick={handleShowEnforcement}
                    >
                      <span>{showEnforcement ? "Remove" : "Add"}</span>{" "}
                      Enforcements{" "}
                      <span style={{ color: "red", fontSize: "0.9rem" }}>
                        {" "}
                        (optional)
                      </span>
                    </p>
                    {showEnforcement ? (
                      <div className={styles.enforcementSelection}>
                        <div>
                          <EnforcementsCalendar
                            sendDateToParent={handleDateFromCalendar}
                            sendDayToParent={handleDayFromCalendar}
                          />
                        </div>
                        <div>
                          <div className={styles.enforcementSelectContainer}>
                            {enforcementDay === "Sun" ? (
                              <select onChange={handleOfficiationChange}>
                                <option disabled selected value="">
                                  Choose officiation type...
                                </option>

                                <option value="conductor">Conductor</option>
                                <option value="first_lesson_reader">
                                  First Lesson Reader
                                </option>
                                <option value="second_lesson_reader">
                                  Second Lesson Reader
                                </option>
                                <option value="preacher">Preacher</option>
                              </select>
                            ) : (
                              <select onChange={handleOfficiationChange}>
                                <option disabled selected value="">
                                  Choose officiation type...
                                </option>

                                <option value="conductor">Conductor</option>
                                <option value="first_lesson_reader">
                                  First Lesson Reader
                                </option>
                                <option value="preacher">Preacher</option>
                              </select>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                  </div>
                </section>
                <div className={styles.actionsContainer}>
                  <div
                    onClick={handleAddNewOfficiator}
                    className={styles.addNew}
                  >
                    <IconPlus />
                    <p>Add new officiator</p>
                  </div>
                  <button
                    onClick={handleSaveToRoster}
                    className={styles.saveToRoster}
                    disabled={disableSendButton}
                    style={{
                      opacity: disableSendButton ? 0.5 : 1,
                      cursor: disableSendButton ? "" : "pointer",
                    }}
                  >
                    {loading ? (
                      <Loading width={"1rem"} height={"1rem"} />
                    ) : (
                      "Save to Roster"
                    )}
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className={styles.displayAllOfficiators}>
          {rosterData && rosterData !== null ? (
            <div>
              <div className={styles.rosterHeader}>
                <h3 className={styles.title}>Generated roster</h3>
                <IconDownload
                  className={styles.downloadIcon}
                  onClick={downloadPDF}
                />
              </div>
              <div className={styles.scrollContainer}>
                <div id="target">
                  <Roster services={rosterData} />
                </div>
              </div>

              <div className={styles.feedbackContainer}>
                <Feedback />
              </div>
            </div>
          ) : (
            ""
          )}
          {/* <Roster services={services} /> */}
        </div>
      </div>
    </Dashboard>
  );
};

export default ManageOfficiators;
