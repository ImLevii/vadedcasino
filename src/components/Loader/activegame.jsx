function ActiveGame(props) {
  return (
    <>
      <div className='loader-container'>
        <div className='loader'/>
      </div>

      <style jsx>{`
        .loader-container {
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: center;

          width: 31px;
          height: 31px;
          flex-shrink: 0;

          border-radius: 3px;
          border: 1px dashed rgba(31, 214, 95, 0.25);
          background: linear-gradient(0deg, rgba(31, 214, 95, 0.25) 0%, rgba(31, 214, 95, 0.25) 100%), linear-gradient(230deg, #12151c 0%, #1f242e 100%);
        }

        .loader {
          height: 12px;
          width: 12px;
          border-top: 2px solid #1fd65f;
          border-left: 2px solid #1fd65f;
          border-right: 2px solid #1fd65f;
          border-radius: 50%;
          animation: infinite linear spin 1s;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}

export default ActiveGame;
